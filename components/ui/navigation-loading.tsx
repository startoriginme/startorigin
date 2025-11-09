"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function NavigationLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true)
      setProgress(10)
      
      const timer1 = setTimeout(() => setProgress(30), 100)
      const timer2 = setTimeout(() => setProgress(50), 200)
      const timer3 = setTimeout(() => setProgress(70), 300)
      const timer4 = setTimeout(() => setProgress(85), 500)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    } else {
      if (progress > 0) {
        setProgress(100)
        const timer = setTimeout(() => {
          setIsVisible(false)
          setProgress(0)
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [isLoading, progress])

  useEffect(() => {
    setIsLoading(false)
  }, [pathname])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest("a")
      
      if (anchor && anchor.href && !anchor.href.includes("#")) {
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

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50 overflow-hidden">
      <div 
        className="h-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
