"use client"

import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, LogOut } from "lucide-react"
import Link from "next/link"
import { ProfileMobileMenu } from "@/components/profile-mobile-menu"
import { User } from "@supabase/supabase-js"

interface HeaderClientProps {
  user: User
  onSignOut: () => Promise<void>
}

export function HeaderClient({ user, onSignOut }: HeaderClientProps) {
  return (
    <nav className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Lightbulb className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-foreground">StartOrigin</span>
      </Link>
      
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-4">
        <Link href="/problems/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Share Problem
          </Button>
        </Link>
        <form action={onSignOut}>
          <Button variant="outline" type="submit" className="gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <ProfileMobileMenu user={user} onSignOut={onSignOut} />
      </div>
    </nav>
  )
}
