import { createClient } from "@/lib/supabase/server"
import { ProblemsFeed } from "@/components/problems-feed"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowRight, Crown, Award, Medal } from "lucide-react"
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

  // Get top 3 problems by upvotes
  const trendingProblems = problems 
    ? [...problems]
        .sort((a, b) => b.upvotes - a.upvotes)
        .slice(0, 3)
    : []

  // Remove trending problems from main list to avoid duplicates
  const regularProblems = problems 
    ? problems.filter(problem => !trendingProblems.some(trending => trending.id === problem.id))
    : []

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500 fill-yellow-500" />
      case 2:
        return <Award className="h-5 w-5 text-gray-400 fill-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600 fill-amber-600" />
      default:
        return null
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-semibold">🥇 1st</div>
      case 2:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-400 text-white text-xs font-semibold">🥈 2nd</div>
      case 3:
        return <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600 text-white text-xs font-semibold">🥉 3rd</div>
      default:
        return null
    }
  }

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
        {/* Trending Top-3 Problems Section */}
        {trendingProblems.length > 0 && (
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                Trending Top-3 Problems
              </h2>
              <p className="text-muted-foreground">
                Users find these problems interesting
              </p>
            </div>

            <div className="space-y-4">
              {trendingProblems.map((problem, index) => {
                const rank = index + 1
                return (
                  <div 
                    key={problem.id} 
                    className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow relative"
                  >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -left-2">
                      {getRankBadge(rank)}
                    </div>
                    
                    <div className="flex items-start gap-3">
                      {/* Rank Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getRankIcon(rank)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/problems/${problem.id}`}>
                          <h3 className="font-semibold text-foreground mb-2 hover:text-primary transition-colors line-clamp-2 text-lg">
                            {problem.title}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {problem.description}
                        </p>
                        
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Lightbulb className="h-4 w-4" />
                              <span className="font-semibold">{problem.upvotes} upvotes</span>
                            </div>
                            {problem.profiles?.username && (
                              <span>by @{problem.profiles.username}</span>
                            )}
                          </div>
                          
                          {problem.category && (
                            <div className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded">
                              {problem.category}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* All Problems Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Explore Problems</h2>
            <p className="text-muted-foreground">Discover problems from the community</p>
          </div>

          <ProblemsFeed 
            initialProblems={[...trendingProblems, ...regularProblems]} 
            userId={user?.id} 
          />
        </section>
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
