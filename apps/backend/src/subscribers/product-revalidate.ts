import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function productRevalidateHandler({
  event,
}: SubscriberArgs<{ id: string }>) {
  const storefrontUrl = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !secret) {
    return
  }

  try {
    await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({
        paths: [{ path: "/", type: "layout" }],
      }),
    })
  } catch (err) {
    console.error(
      `Revalidate call to ${storefrontUrl} failed for ${event.name}:`,
      (err as Error).message
    )
  }
}

export const config: SubscriberConfig = {
  event: [
    "product.updated",
    "product.created",
    "product.deleted",
    "product-variant.updated",
    "product-variant.created",
    "product-variant.deleted",
    "price.updated",
    "price.created",
    "price.deleted",
  ],
}
