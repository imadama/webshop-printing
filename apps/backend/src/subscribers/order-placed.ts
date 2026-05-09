import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModule = container.resolve(Modules.ORDER)
  const notificationModule = container.resolve(Modules.NOTIFICATION)

  const order = await orderModule.retrieveOrder(event.data.id, {
    relations: ["items", "shipping_address"],
  })

  if (!order.email) {
    return
  }

  await notificationModule.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    data: {
      order_id: order.id,
      display_id: order.display_id,
      total: order.total,
      currency_code: order.currency_code,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
