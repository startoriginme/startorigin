"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function NavigationLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsLoading(false)
  }, [pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest("a")
      
      if (anchor && anchor.href) {
        const targetUrl = new URL(anchor.href)
        const currentUrl = new URL(window.location.href)
        
        if (targetUrl.pathname !== currentUrl.pathname) {
          setIsLoading(true)
        }
      }
    }

    document.addEventListener("click", handleClick)
    
    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [])

  if (!isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 overflow-hidden">
      <div className="h-full bg-primary animate-pulse w-full"></div>
    </div>
  )
}
