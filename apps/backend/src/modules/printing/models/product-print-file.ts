import { model } from "@medusajs/framework/utils"

export const ProductPrintFile = model.define("product_print_file", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  file_url: model.text(),
  filename: model.text(),
  file_format: model.text(),
  file_size_bytes: model.number(),
  volume_cm3: model.number().nullable(),
  default_material: model.text().nullable(),
  default_color: model.text().nullable(),
  default_infill_percent: model.number().nullable(),
  notes: model.text().nullable(),
})
