import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { processPaymentWorkflow } from "@medusajs/medusa/core-flows"

// Mollie posts `id={paymentId}` as application/x-www-form-urlencoded.
// We resolve the matching action via the Mollie provider's
// getWebhookActionAndData and then run processPaymentWorkflow which
// authorizes / captures / cancels the corresponding payment session.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const paymentModule = req.scope.resolve(Modules.PAYMENT)

  const id =
    (req.body as Record<string, string> | undefined)?.id ??
    (req.query?.id as string | undefined)

  if (!id) {
    res.status(400).json({ message: "Missing payment id" })
    return
  }

  const event = await paymentModule.getWebhookActionAndData({
    provider: "mollie",
    payload: {
      data: { id },
      rawData: { id } as unknown as Buffer,
      headers: req.headers as Record<string, string>,
    },
  })

  await processPaymentWorkflow(req.scope).run({ input: event })

  // Mollie expects 200 with empty body
  res.sendStatus(200)
}
