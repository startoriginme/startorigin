import { createClient } from "@/lib/supabase/server"
import { ProblemsFeed } from "@/components/problems-feed"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"

export default async function ProblemsPage() {
  const supabase = await createClient()

  // Fetch problems with author profiles
  const { data: problems, error } = await supabase
    .from("problems")
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching problems:", error)
  }

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>
            
            {/* Desktop Navigation - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Share Problem
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline">Profile</Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button - hidden on desktop */}
            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          </nav>
        </div>
      </header>

      {/* Minimal Hero Section */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-foreground">
              Share Problems, Create Solutions
            </h1>
            <p className="mb-6 text-muted-foreground">
              A platform for innovators to collaborate on meaningful problems
            </p>
            <Link href="https://startorigin.me/problems/00d8dd35-a4e8-49b5-bc0a-18b15c75c52d">
              <Button variant="outline" className="gap-2">
                Launch!
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Explore Problems</h2>
          <p className="text-muted-foreground">Discover problems from the community</p>
        </div>

        <ProblemsFeed initialProblems={problems || []} userId={user?.id} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground text-sm">
            © 2025 StartOrigin. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
