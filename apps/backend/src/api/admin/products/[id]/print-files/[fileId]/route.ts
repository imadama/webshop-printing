import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { fileId } = req.params
  const printingService: any = req.scope.resolve("printing")

  await printingService.deleteProductPrintFiles(fileId)

  return res.json({ id: fileId, object: "product_print_file", deleted: true })
}
