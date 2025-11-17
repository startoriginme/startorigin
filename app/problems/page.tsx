import { createClient } from "@/lib/supabase/server"
import { ProblemsFeed } from "@/components/problems-feed"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowRight, Medal, Crown, Award, Star } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
        .map((problem, index) => ({
          ...problem,
          rank: index + 1
        }))
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
        return <Star className="h-5 w-5 text-blue-500" />
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
      case 2:
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200"
      case 3:
        return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200"
      default:
        return "bg-card"
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">🥇 1st</Badge>
      case 2:
        return <Badge className="bg-gray-400 text-white hover:bg-gray-500">🥈 2nd</Badge>
      case 3:
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">🥉 3rd</Badge>
      default:
        return <Badge>#{rank}</Badge>
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

            <div className="grid gap-4 md:grid-cols-3">
              {trendingProblems.map((problem) => (
                <Card 
                  key={problem.id} 
                  className={`transition-all hover:shadow-lg ${getRankColor(problem.rank)}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRankIcon(problem.rank)}
                        <span className="font-semibold text-foreground">
                          #{problem.rank}
                        </span>
                      </div>
                      {getRankBadge(problem.rank)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/problems/${problem.id}`}>
                      <h3 className="font-semibold text-foreground mb-2 hover:text-primary transition-colors line-clamp-2">
                        {problem.title}
                      </h3>
                    </Link>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {problem.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Lightbulb className="h-4 w-4" />
                          <span>{problem.upvotes} upvotes</span>
                        </div>
                      </div>
                      {problem.profiles?.username && (
                        <span className="text-xs text-muted-foreground">
                          @{problem.profiles.username}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* All Problems Section */}
        <section>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Explore Problems</h2>
            <p className="text-muted-foreground">Discover problems from the community</p>
          </div>

          <ProblemsFeed initialProblems={problems || []} userId={user?.id} />
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
