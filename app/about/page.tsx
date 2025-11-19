import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Lightbulb } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function AboutPage() {
  const supabase = await createClient()

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
              <Link href="/about">
                <Button variant="ghost">About</Button>
              </Link>
              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      Share Problem
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.display_name || user.email} />
                          <AvatarFallback>
                            {user.user_metadata?.display_name?.[0] || user.email?.[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/profile">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/sign-out">Sign Out</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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

      {/* About Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">About StartOrigin</h1>
            <p className="text-xl text-muted-foreground">
              Empowering innovators to solve meaningful problems together
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
              <p className="text-muted-foreground">
                StartOrigin is a platform where innovators, entrepreneurs, and problem-solvers 
                come together to share real-world problems and collaborate on innovative solutions.
              </p>
              <p className="text-muted-foreground">
                We believe that the most meaningful innovations start with understanding 
                the right problems to solve.
              </p>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Share problems you've encountered in your industry or daily life
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Discover problems shared by other community members
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Collaborate on solutions and form teams
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  Turn ideas into real-world impact
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Join Our Community</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Whether you're an entrepreneur, developer, designer, or simply someone with 
              great ideas, StartOrigin provides the platform to connect, collaborate, and 
              create meaningful change.
            </p>
            {user ? (
              <Link href="/problems">
                <Button size="lg">Explore Problems</Button>
              </Link>
            ) : (
              <Link href="/auth/sign-up">
                <Button size="lg">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
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
