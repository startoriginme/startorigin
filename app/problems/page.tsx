import { createClient } from "@/lib/supabase/server"
import { ProblemsFeed } from "@/components/problems-feed"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, Menu, X, Rocket, ArrowRight } from "lucide-react"
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
    <div className="min-h-screen bg-background">
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Rocket className="h-4 w-4" />
              Launching StartOrigin
            </div>
            
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Share Problems,
              <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Find Solutions
              </span>
            </h1>
            
            <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto">
              A collaborative platform where innovators share challenges and build solutions together. 
              Join our community of problem-solvers and change-makers.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="https://startorigin.netlify.app/problems/00d8dd35-a4e8-49b5-bc0a-18b15c75c52d">
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
                  See Example Problem
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              {!user && (
                <Link href="/auth/sign-up">
                  <Button variant="outline" size="lg" className="gap-2">
                    Join Community
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-10 left-10 h-20 w-20 rounded-full bg-primary/10 blur-xl"></div>
        <div className="absolute bottom-10 right-10 h-16 w-16 rounded-full bg-accent/10 blur-xl"></div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">Explore Community Problems</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover challenges shared by innovators, entrepreneurs, and creators from around the world. 
            Upvote, comment, and collaborate on solutions.
          </p>
        </div>

        <ProblemsFeed initialProblems={problems || []} userId={user?.id} />
      </main>
    </div>
  )
}
