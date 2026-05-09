import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import { Logger, NotificationTypes } from "@medusajs/framework/types"
import nodemailer, { Transporter } from "nodemailer"

type Options = {
  host: string
  port: number
  user?: string
  pass?: string
  from: string
  channels?: string[]
}

type InjectedDependencies = {
  logger: Logger
}

class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "smtp"

  protected logger_: Logger
  protected options_: Options
  protected transporter_: Transporter

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.host) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP notification provider requires `host` option."
      )
    }
    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP notification provider requires `from` option."
      )
    }
  }

  constructor({ logger }: InjectedDependencies, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options

    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth:
        options.user && options.pass
          ? { user: options.user, pass: options.pass }
          : undefined,
    })
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "SMTP notification requires a `to` address."
      )
    }

    const { subject, html, text } = this.renderTemplate(notification)

    try {
      const info = await this.transporter_.sendMail({
        from: this.options_.from,
        to: notification.to,
        subject,
        html,
        text,
      })

      return { id: info.messageId }
    } catch (e) {
      this.logger_.error(
        `SMTP send failed to ${notification.to}: ${(e as Error).message}`
      )
      throw e
    }
  }

  private renderTemplate(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): { subject: string; html: string; text: string } {
    // Inline templates per template id. Replace with react-email later if desired.
    const data = (notification.data ?? {}) as Record<string, unknown>

    switch (notification.template) {
      case "order-placed":
        return this.orderPlaced(data)
      case "order-shipped":
        return this.orderShipped(data)
      default:
        return {
          subject: (data.subject as string) || "Bericht van Popify",
          html:
            (data.html as string) ||
            `<p>${(data.message as string) || ""}</p>`,
          text:
            (data.text as string) ||
            (data.message as string) ||
            "",
        }
    }
  }

  private orderPlaced(data: Record<string, unknown>) {
    const orderNumber = data.display_id ?? data.order_id ?? ""
    const total = data.total ?? ""
    const currency = (data.currency_code as string)?.toUpperCase() ?? "EUR"

    const subject = `Bedankt voor je bestelling${orderNumber ? ` #${orderNumber}` : ""} bij Popify`
    const text = `Hoi! We hebben je bestelling ontvangen${orderNumber ? ` (#${orderNumber})` : ""}.\n\nTotaal: ${total} ${currency}\n\nWe nemen je bestelling zo snel mogelijk in productie. Je krijgt bericht zodra deze onderweg is.\n\n— Popify`
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="margin-bottom:8px">Bedankt voor je bestelling 🎉</h1>
        <p>We hebben je bestelling${orderNumber ? ` <strong>#${orderNumber}</strong>` : ""} goed ontvangen.</p>
        <p><strong>Totaal:</strong> ${total} ${currency}</p>
        <p>We nemen je bestelling zo snel mogelijk in productie. Je krijgt bericht zodra deze onderweg is.</p>
        <p style="margin-top:24px;color:#666">— Popify</p>
      </div>
    `
    return { subject, text, html }
  }

  private orderShipped(data: Record<string, unknown>) {
    const orderNumber = data.display_id ?? data.order_id ?? ""
    const trackingUrl = data.tracking_url as string | undefined
    const trackingNumber = data.tracking_number as string | undefined

    const subject = `Je bestelling${orderNumber ? ` #${orderNumber}` : ""} is onderweg`
    const text = `Goed nieuws — je bestelling is verzonden!${
      trackingNumber ? `\n\nTrack-and-trace: ${trackingNumber}` : ""
    }${trackingUrl ? `\nLink: ${trackingUrl}` : ""}\n\n— Popify`
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="margin-bottom:8px">Onderweg naar je toe 📦</h1>
        <p>Je bestelling${orderNumber ? ` <strong>#${orderNumber}</strong>` : ""} is verzonden.</p>
        ${trackingNumber ? `<p><strong>Track-and-trace:</strong> ${trackingNumber}</p>` : ""}
        ${trackingUrl ? `<p><a href="${trackingUrl}">Volg je pakket</a></p>` : ""}
        <p style="margin-top:24px;color:#666">— Popify</p>
      </div>
    `
    return { subject, text, html }
  }
}

export default SmtpNotificationService
