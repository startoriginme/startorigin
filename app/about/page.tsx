import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Lightbulb, ArrowRight, Users, Target, Zap, Globe } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"

export default async function AboutPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const features = [
    {
      icon: <Target className="h-8 w-8" />,
      title: "Problem-First Approach",
      description: "Start with the problem, not the solution. Validate real pain points before building."
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community Collaboration",
      description: "Connect with innovators, founders, and problem-solvers from around the world."
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Rapid Validation",
      description: "Quickly gauge interest and gather feedback on problems that matter to people."
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Perspective",
      description: "Discover problems from different cultures, industries, and perspectives."
    }
  ]

  const stats = [
    { number: "100+", label: "Problems Shared" },
    { number: "50+", label: "Active Innovators" },
    { number: "24/7", label: "Global Access" },
    { number: "0%", label: "Commission Fees" }
  ]

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

      {/* Hero Section */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 mb-6">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">The Problem-Solving Platform</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold text-foreground">
              Where Great Ideas Begin
            </h1>
            <p className="mb-8 text-xl text-muted-foreground leading-relaxed">
              StartOrigin is built on a simple belief: the most innovative solutions start with deeply understanding real problems. We're creating a space where problems find their perfect solvers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/problems">
                <Button size="lg" className="gap-2">
                  Explore Problems
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {!user && (
                <Link href="/auth/sign-up">
                  <Button variant="outline" size="lg">
                    Join Community
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border bg-card/30 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why StartOrigin?
            </h2>
            <p className="text-muted-foreground">
              We're rethinking how innovation happens—starting with the problem, not the solution.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4 p-6 rounded-lg border border-border bg-card/50">
                <div className="flex-shrink-0 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="border-b border-border bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Our Mission
              </h2>
              <p className="text-xl text-muted-foreground">
                To democratize innovation by connecting real problems with passionate solvers
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Problem Validation</h3>
                <p className="text-muted-foreground text-sm">
                  Ensure you're solving problems people actually care about
                </p>
              </div>
              
              <div className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Community Building</h3>
                <p className="text-muted-foreground text-sm">
                  Connect with like-minded innovators and potential cofounders
                </p>
              </div>
              
              <div className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Rapid Iteration</h3>
                <p className="text-muted-foreground text-sm">
                  Get immediate feedback and iterate on your problem understanding
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-card/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Start?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join innovators from around the world who are solving meaningful problems
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href="/problems/new">
                  <Button size="lg" className="gap-2">
                    Share Your First Problem
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/sign-up">
                    <Button size="lg" className="gap-2">
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/problems">
                    <Button variant="outline" size="lg">
                      Browse Problems
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
