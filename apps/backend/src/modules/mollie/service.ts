import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import createMollieClient, {
  MollieClient,
  PaymentStatus,
} from "@mollie/api-client"

type Options = {
  apiKey: string
  webhookUrl?: string
}

type InjectedDependencies = {
  logger: Logger
}

class MollieProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "mollie"

  protected logger_: Logger
  protected options_: Options
  protected client_: MollieClient

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mollie payment provider requires an `apiKey` option."
      )
    }
  }

  constructor(container: InjectedDependencies, options: Options) {
    // @ts-expect-error - super signature is broader than the type
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = createMollieClient({ apiKey: options.apiKey })
  }

  private formatAmount(amount: number, currencyCode: string) {
    return {
      currency: currencyCode.toUpperCase(),
      value: (amount / 100).toFixed(2),
    }
  }

  private parseAmount(value: string): number {
    return Math.round(parseFloat(value) * 100)
  }

  private mapStatus(status: PaymentStatus): PaymentSessionStatus {
    switch (status) {
      case PaymentStatus.paid:
      case PaymentStatus.authorized:
        return PaymentSessionStatus.AUTHORIZED
      case PaymentStatus.canceled:
      case PaymentStatus.expired:
      case PaymentStatus.failed:
        return PaymentSessionStatus.CANCELED
      case PaymentStatus.pending:
      case PaymentStatus.open:
      default:
        return PaymentSessionStatus.PENDING
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input
    const numericAmount =
      typeof amount === "object" ? Number((amount as BigNumber).numeric) : Number(amount)

    const payment = await this.client_.payments.create({
      amount: this.formatAmount(numericAmount, currency_code),
      description: `Order ${context?.idempotency_key ?? "checkout"}`,
      redirectUrl:
        (context?.return_url as string) ||
        process.env.STORE_CORS?.split(",")[0] ||
        "https://example.com",
      webhookUrl: this.options_.webhookUrl,
      metadata: {
        session_id: context?.session_id,
        cart_id: context?.cart_id,
      },
    })

    return {
      id: payment.id,
      data: {
        id: payment.id,
        status: payment.status,
        checkout_url: payment._links?.checkout?.href,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const id = input.data?.id as string
    const payment = await this.client_.payments.get(id)
    return {
      status: this.mapStatus(payment.status),
      data: { id: payment.id, status: payment.status },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Mollie payments are auto-captured for iDEAL/cards. Just retrieve.
    const id = input.data?.id as string
    const payment = await this.client_.payments.get(id)
    return { data: { id: payment.id, status: payment.status } }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const id = input.data?.id as string
    try {
      const payment = await this.client_.payments.get(id)
      if (payment.isCancelable) {
        await this.client_.payments.cancel(id)
      }
      return { data: { id, status: "canceled" } }
    } catch (e) {
      this.logger_.error(`Mollie cancel failed for ${id}: ${(e as Error).message}`)
      return { data: input.data ?? {} }
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input as CancelPaymentInput)
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const id = input.data?.id as string
    const payment = await this.client_.payments.get(id)
    return {
      status: this.mapStatus(payment.status),
      data: { id: payment.id, status: payment.status },
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const id = input.data?.id as string
    const payment = await this.client_.payments.get(id)
    const numericAmount =
      typeof input.amount === "object"
        ? Number((input.amount as BigNumber).numeric)
        : Number(input.amount)

    const refund = await this.client_.paymentRefunds.create({
      paymentId: id,
      amount: this.formatAmount(numericAmount, payment.amount.currency),
    })
    return {
      data: { id: payment.id, refund_id: refund.id, status: refund.status },
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const id = input.data?.id as string
    const payment = await this.client_.payments.get(id)
    return { data: { id: payment.id, status: payment.status } }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    // Mollie does not allow editing amount on an existing payment.
    // Initiate a fresh one with the new amount.
    return this.initiatePayment(input as InitiatePaymentInput)
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const id =
      (payload.data as Record<string, string> | undefined)?.id ??
      (payload.rawData as unknown as { id?: string })?.id

    if (!id) {
      return {
        action: "not_supported",
        data: { session_id: "", amount: new BigNumber(0) },
      }
    }

    try {
      const payment = await this.client_.payments.get(id)
      const sessionId = (payment.metadata as Record<string, string> | null)
        ?.session_id ?? ""
      const amount = new BigNumber(this.parseAmount(payment.amount.value))

      switch (payment.status) {
        case PaymentStatus.paid:
        case PaymentStatus.authorized:
          return {
            action: "authorized",
            data: { session_id: sessionId, amount },
          }
        case PaymentStatus.canceled:
        case PaymentStatus.expired:
        case PaymentStatus.failed:
          return {
            action: "canceled",
            data: { session_id: sessionId, amount },
          }
        default:
          return {
            action: "not_supported",
            data: { session_id: sessionId, amount },
          }
      }
    } catch (e) {
      this.logger_.error(
        `Mollie webhook lookup failed for ${id}: ${(e as Error).message}`
      )
      return {
        action: "failed",
        data: { session_id: "", amount: new BigNumber(0) },
      }
    }
  }
}

export default MollieProviderService
