"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Edit, LogOut, MoreVertical } from "lucide-react"
import Link from "next/link"

interface ProfileActionsProps {
  onSignOut: () => void
}

export function ProfileActions({ onSignOut }: ProfileActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <>
      {/* Desktop buttons */}
      <div className="hidden md:flex items-center gap-2">
        <Link href="/profile/edit">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
        <form action={onSignOut}>
          <Button variant="outline" size="sm" type="submit" className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>

      {/* Mobile dropdown */}
      <div className="md:hidden relative" ref={dropdownRef}>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-transparent p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-border bg-background shadow-lg z-50">
            <div className="py-1">
              <Link 
                href="/profile/edit" 
                className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Link>
              <button 
                onClick={() => {
                  onSignOut()
                  setIsOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
