// components/mobile-menu.tsx
"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User } from "@supabase/supabase-js"

interface MobileMenuProps {
  user: User | null
}

export function MobileMenu({ user }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

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
              {user ? (
                <>
                  <Link href="/problems/new" onClick={closeMenu}>
                    <Button className="w-full gap-2 justify-start">
                      Share Problem
                    </Button>
                  </Link>
                  <Link href="/profile" onClick={closeMenu}>
                    <Button variant="outline" className="w-full justify-start">
                      Profile
                    </Button>
                  </Link>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground px-2">
                      Signed in as {user.email}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth/login" onClick={closeMenu}>
                    <Button variant="outline" className="w-full justify-start">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up" onClick={closeMenu}>
                    <Button className="w-full justify-start">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
