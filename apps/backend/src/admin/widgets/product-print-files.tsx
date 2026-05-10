import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Button, Container, Heading, Input, Text, Textarea, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"

type PrintFile = {
  id: string
  product_id: string
  file_url: string
  filename: string
  file_format: string
  file_size_bytes: number
  volume_cm3: number | null
  default_material: string | null
  default_color: string | null
  default_infill_percent: number | null
  notes: string | null
  created_at: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ProductPrintFilesWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const productId = data.id
  const [files, setFiles] = useState<PrintFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [material, setMaterial] = useState("")
  const [color, setColor] = useState("")
  const [infill, setInfill] = useState("")
  const [notes, setNotes] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/products/${productId}/print-files`, {
        credentials: "include",
      })
      const json = await res.json()
      setFiles(json.print_files ?? [])
    } catch (e) {
      toast.error("Kon print-files niet laden")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [productId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      // 1. Upload via Medusa's built-in file endpoint
      const formData = new FormData()
      formData.append("files", file)
      const uploadRes = await fetch("/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
      const uploadJson = await uploadRes.json()
      const uploaded = uploadJson.files?.[0] ?? uploadJson.uploads?.[0]
      if (!uploaded?.url) throw new Error("No URL returned from upload")

      // 2. Create the print-file record
      const createRes = await fetch(`/admin/products/${productId}/print-files`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: uploaded.url,
          filename: file.name,
          file_size_bytes: file.size,
          default_material: material || null,
          default_color: color || null,
          default_infill_percent: infill ? Number(infill) : null,
          notes: notes || null,
        }),
      })
      if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`)

      toast.success(`${file.name} geüpload`)
      setMaterial("")
      setColor("")
      setInfill("")
      setNotes("")
      if (fileInputRef.current) fileInputRef.current.value = ""
      await refresh()
    } catch (e) {
      toast.error(`Upload mislukt: ${(e as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm("Print-file verwijderen?")) return
    try {
      const res = await fetch(`/admin/products/${productId}/print-files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
      toast.success("Verwijderd")
      await refresh()
    } catch (e) {
      toast.error(`Verwijderen mislukt: ${(e as Error).message}`)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Print-bestanden</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          STL/3MF bestanden gekoppeld aan dit product
        </Text>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Standaard materiaal (bijv. PLA)"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
          <Input
            placeholder="Standaard kleur (bijv. Zwart)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="Infill % (0-100)"
            value={infill}
            onChange={(e) => setInfill(e.target.value)}
          />
          <Input
            placeholder="Notities (optioneel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".stl,.3mf"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
            }}
            className="text-sm"
            disabled={uploading}
          />
          {uploading && <Text size="small">Uploaden…</Text>}
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text size="small">Laden…</Text>
        ) : files.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            Nog geen print-bestanden geüpload.
          </Text>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-4 rounded border border-ui-border-base px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-ui-fg-interactive"
                  >
                    {f.filename}
                  </a>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {f.file_format.toUpperCase()} · {formatBytes(f.file_size_bytes)}
                    {f.volume_cm3 != null && ` · ${f.volume_cm3.toFixed(2)} cm³`}
                    {f.default_material && ` · ${f.default_material}`}
                    {f.default_color && ` · ${f.default_color}`}
                    {f.default_infill_percent != null &&
                      ` · ${f.default_infill_percent}% infill`}
                  </Text>
                </div>
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => void handleDelete(f.id)}
                >
                  Verwijderen
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductPrintFilesWidget
