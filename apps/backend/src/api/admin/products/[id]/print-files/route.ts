import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { parseStlVolume } from "../../../../../lib/mesh/stl"

type CreateBody = {
  file_url: string
  filename: string
  file_size_bytes: number
  default_material?: string | null
  default_color?: string | null
  default_infill_percent?: number | null
  notes?: string | null
}

function detectFormat(filename: string): "stl" | "3mf" | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".stl")) return "stl"
  if (lower.endsWith(".3mf")) return "3mf"
  return null
}

async function fetchAndParseVolume(fileUrl: string): Promise<number | null> {
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return null
    const arr = await res.arrayBuffer()
    return parseStlVolume(Buffer.from(arr))
  } catch {
    return null
  }
}

export const POST = async (
  req: MedusaRequest<CreateBody>,
  res: MedusaResponse
) => {
  const { id: productId } = req.params
  const body = req.body

  if (!body?.file_url || !body?.filename || typeof body.file_size_bytes !== "number") {
    return res.status(400).json({
      error: "file_url, filename, and file_size_bytes are required",
    })
  }

  const format = detectFormat(body.filename)
  if (!format) {
    return res.status(400).json({
      error: "Only .stl and .3mf files are supported",
    })
  }

  const printingService: any = req.scope.resolve("printing")

  let volumeCm3: number | null = null
  if (format === "stl") {
    volumeCm3 = await fetchAndParseVolume(body.file_url)
  }

  const created = await printingService.createProductPrintFiles({
    product_id: productId,
    file_url: body.file_url,
    filename: body.filename,
    file_format: format,
    file_size_bytes: body.file_size_bytes,
    volume_cm3: volumeCm3,
    default_material: body.default_material ?? null,
    default_color: body.default_color ?? null,
    default_infill_percent: body.default_infill_percent ?? null,
    notes: body.notes ?? null,
  })

  return res.status(201).json({ print_file: created })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: productId } = req.params
  const printingService: any = req.scope.resolve("printing")

  const print_files = await printingService.listProductPrintFiles({
    product_id: productId,
  })

  return res.json({ print_files })
}
