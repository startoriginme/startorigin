"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Lightbulb, Users, Zap, Menu } from "lucide-react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AboutPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost">Explore Problems</Button>
              </Link>
              {!user && (
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

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 mt-8">
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start">
                      Explore Problems
                    </Button>
                  </Link>
                  {!user && (
                    <>
                      <Link href="/auth/login">
                        <Button variant="outline" className="w-full bg-transparent">
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/auth/sign-up">
                        <Button className="w-full">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Zap className="h-4 w-4" />
            <span>Where Problems Meet Solutions</span>
          </div>
          <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Share Problems,
            <br />
            <span className="text-primary">Find Solutions</span>
          </h1>
          <p className="mb-8 text-pretty text-lg text-muted-foreground md:text-xl">
            StartOrigin is a platform where innovators and entrepreneurs share real-world problems and collaborate to
            find solutions.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {!user ? (
              <>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="gap-2">
                    Share Your Problem
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button size="lg" variant="outline">
                    Explore Problems
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/">
                <Button size="lg" className="gap-2">
                  Explore Problems
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Our Mission</h2>
              <p className="text-lg text-muted-foreground">
                We believe every problem is an opportunity. Our mission is to connect problem-solvers with real
                challenges.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Lightbulb className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-card-foreground">Share Problems</h3>
                  <p className="text-muted-foreground">
                    Post real-world challenges you're facing and get feedback from the community.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-card-foreground">Collaborate</h3>
                  <p className="text-muted-foreground">
                    Connect with innovators, entrepreneurs, and problem-solvers worldwide.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-card-foreground">Find Solutions</h3>
                  <p className="text-muted-foreground">
                    Discover innovative solutions and turn problems into opportunities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-4xl rounded-2xl bg-primary px-8 py-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Get Started</h2>
            <p className="mb-8 text-lg text-primary-foreground/90">
              Join our community of innovators and start sharing problems today.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg" variant="secondary" className="gap-2">
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">StartOrigin</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 StartOrigin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
