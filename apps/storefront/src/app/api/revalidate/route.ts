import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

type RevalidatePayload = {
  tags?: string[]
  paths?: Array<{ path: string; type?: "page" | "layout" }>
}

export async function POST(req: NextRequest) {
  const provided =
    req.headers.get("x-revalidate-secret") ??
    req.nextUrl.searchParams.get("secret")

  if (!process.env.REVALIDATE_SECRET || provided !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: RevalidatePayload = {}
  try {
    body = (await req.json()) as RevalidatePayload
  } catch {
    body = {}
  }

  const tags = body.tags ?? []
  const paths = body.paths ?? [{ path: "/", type: "layout" }]

  for (const t of tags) revalidateTag(t)
  for (const p of paths) revalidatePath(p.path, p.type)

  return NextResponse.json({ ok: true, tags, paths })
}
