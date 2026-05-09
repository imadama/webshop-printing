import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "Popify",
    template: "%s — Popify",
  },
  description: "Popify — eigen ontwerpen en custom 3D prints op maat.",
  openGraph: {
    siteName: "Popify",
    type: "website",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-mode="light">
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
