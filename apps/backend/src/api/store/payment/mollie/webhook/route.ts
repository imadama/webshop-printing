import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

// Mollie sends id={paymentId} as application/x-www-form-urlencoded.
// We delegate to the payment module which calls the Mollie provider's
// getWebhookActionAndData and then performs the configured action
// (authorize / capture / cancel) on the matching payment session.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const paymentModule = req.scope.resolve(Modules.PAYMENT)

  const id =
    (req.body as Record<string, string> | undefined)?.id ??
    (req.query?.id as string | undefined)

  if (!id) {
    res.status(400).json({ message: "Missing payment id" })
    return
  }

  await paymentModule.processEvent({
    provider: "pp_mollie_mollie",
    payload: {
      data: { id },
      rawData: { id },
      headers: req.headers as Record<string, string>,
    },
  })

  // Mollie expects a 200 with no body
  res.sendStatus(200)
}
