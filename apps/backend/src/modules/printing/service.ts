import { MedusaService } from "@medusajs/framework/utils"
import { ProductPrintFile } from "./models/product-print-file"

class PrintingService extends MedusaService({
  ProductPrintFile,
}) {}

export default PrintingService
