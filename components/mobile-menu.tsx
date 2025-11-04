// components/profile-mobile-menu.tsx
"use client"

import { useState } from "react"
import { Menu, X, Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User } from "@supabase/supabase-js"

interface ProfileMobileMenuProps {
  user: User
  onSignOut: () => void
}

export function ProfileMobileMenu({ user, onSignOut }: ProfileMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const handleSignOut = () => {
    onSignOut()
    closeMenu()
  }

  return (
    <div className="relative">
      {/* Burger Button */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-md text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-16 right-4 w-64 bg-card border border-border rounded-lg shadow-lg z-50 animate-in slide-in-from-right-5 duration-200">
            <div className="p-4 space-y-4">
              {/* Share Problem */}
              <Link href="/problems/new" onClick={closeMenu}>
                <Button className="w-full gap-2 justify-start">
                  <Plus className="h-4 w-4" />
                  Share Problem
                </Button>
              </Link>

              {/* Sign Out Button */}
              <Button 
                variant="outline" 
                className="w-full gap-2 justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              {/* User Info */}
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground px-2">
                  Signed in as {user.email}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
