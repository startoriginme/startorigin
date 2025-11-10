import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Lightbulb, Users, Target, Zap, ArrowRight, Globe, Rocket } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"

export default async function IntroducingPage() {
  let user = null
  
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser
  } catch (error) {
    console.error("Auth error:", error)
    // Continue without user data
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
                  <Link href="/problems">
                    <Button variant="outline">Explore Problems</Button>
                  </Link>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Zap className="h-4 w-4" />
                      Share Problem
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/problems">
                    <Button variant="outline">Explore</Button>
                  </Link>
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
      <section className="border-b border-border bg-gradient-to-br from-card to-card/50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Welcome to StartOrigin</span>
            </div>
            <h1 className="mb-6 text-4xl md:text-5xl font-bold text-foreground">
              Where Innovation Finds Its 
              <span className="text-primary"> Starting Point</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto">
              A collaborative platform where real problems meet brilliant minds. 
              Share challenges, discover solutions, and build the future together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/problems">
                <Button size="lg" className="gap-2">
                  Explore Problems
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/problems">
                <Button variant="outline" size="lg">
                  See Examples
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What is StartOrigin Section */}
      <section className="py-16 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              What is StartOrigin?
            </h2>
            <p className="text-lg text-muted-foreground">
              StartOrigin is more than just a platform—it's a movement to democratize innovation 
              by focusing on the most crucial first step: identifying and understanding real problems.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Problem Focus */}
            <div className="text-center p-6 rounded-lg border border-border bg-card/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Problem-First Approach</h3>
              <p className="text-muted-foreground">
                We believe every great solution starts with a well-defined problem. 
                Share challenges that matter and get diverse perspectives.
              </p>
            </div>

            {/* Community Driven */}
            <div className="text-center p-6 rounded-lg border border-border bg-card/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Community Powered</h3>
              <p className="text-muted-foreground">
                Connect with innovators, experts, and problem-solvers from around the world. 
                Collective intelligence leads to better solutions.
              </p>
            </div>

            {/* Global Impact */}
            <div className="text-center p-6 rounded-lg border border-border bg-card/50">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 mb-4">
                <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Global Impact</h3>
              <p className="text-muted-foreground">
                From local community issues to global challenges, every problem shared 
                has the potential to inspire meaningful change.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-b border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              How StartOrigin Works
            </h2>
            
            <div className="grid gap-8">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg border border-border bg-background">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Share Your Problem</h3>
                  <p className="text-muted-foreground">
                    Describe a real-world problem you're facing. Be specific about the context, 
                    challenges, and why it matters. Great problems inspire great solutions.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg border border-border bg-background">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Get Community Insights</h3>
                  <p className="text-muted-foreground">
                    Receive feedback, perspectives, and potential solutions from a diverse community 
                    of thinkers, makers, and domain experts.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-lg border border-border bg-background">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Collaborate & Build</h3>
                  <p className="text-muted-foreground">
                    Connect with others who are passionate about solving the same problems. 
                    Form teams, prototype solutions, and bring ideas to life.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Make a Difference?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join StartOrigin today and be part of a community that's solving real problems, 
              one challenge at a time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href="/problems/new">
                  <Button size="lg" className="gap-2">
                    <Zap className="h-4 w-4" />
                    Share Your First Problem
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/sign-up">
                    <Button size="lg" className="gap-2">
                      <Rocket className="h-4 w-4" />
                      Join StartOrigin
                    </Button>
                  </Link>
                  <Link href="/problems">
                    <Button variant="outline" size="lg">
                      Explore First
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

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
