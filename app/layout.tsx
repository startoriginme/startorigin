import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "StartOrigin - Share Problems, Create Solutions",
  description: "A platform for innovators to share problems and collaborate on solutions",
  generator: 'v0.app',
  icons: {
    icon: "lightbulb.png",
    shortcut: "lightbulb.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
