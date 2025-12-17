import type { Metadata } from "next"
import { Inter, Montserrat } from "next/font/google"
import "./globals.css"
import { NavigationLoading } from "@/components/ui/navigation-loading"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

// Добавляем Montserrat шрифт
const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-montserrat",
})

export const metadata: Metadata = {
  title: "StartOrigin",
  description: "A platform for innovators to share problems and collaborate on solutions",
  generator: 'v0.app',
  icons: {
    icon: "/lampochka.png",
    shortcut: "/lightbulb.svg",
    apple: "/lightbulb.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${inter.className}`}>
      <body>
        {/* Простой индикатор загрузки сверху */}
        <div className="loading-bar"></div>
        
        <Suspense fallback={null}>
          <NavigationLoading />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
