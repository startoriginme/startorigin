import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, LogOut, User } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { redirect } from "next/navigation"
import { UsernameSearch } from "@/components/username-search"
import { TopUsernames } from "@/components/top-usernames"

export default async function MarketplacePage() {
  const supabase = await createClient()

  // Check if user is authenticated and get profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userProfile = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", user.id)
      .single()
    userProfile = profile
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Server action for logout
  async function handleLogout() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
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
                  
                  {/* Avatar Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={userProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(userProfile?.display_name || userProfile?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form action={handleLogout} className="w-full">
                          <button type="submit" className="flex items-center gap-2 w-full text-left cursor-pointer">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </form>
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

            {/* Mobile Navigation - hidden on desktop */}
            <div className="flex items-center gap-2 md:hidden">
              {user ? (
                <>
                  {/* Mobile Plus Button */}
                  <Link href="/problems/new">
                    <Button size="icon" className="h-9 w-9">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  {/* Mobile Avatar Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={userProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(userProfile?.display_name || userProfile?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form action={handleLogout} className="w-full">
                          <button type="submit" className="flex items-center gap-2 w-full text-left cursor-pointer">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center mb-4">
              <Crown className="h-12 w-12 text-yellow-500" />
            </div>
            <h1 className="mb-4 text-4xl font-bold text-foreground">
              Premium Username Marketplace
            </h1>
            <p className="mb-6 text-xl text-muted-foreground">
              Get exclusive usernames with Telegram Stars
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Powered by Telegram Stars</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Username Search Section */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Find Your Perfect Username
              </h2>
              <p className="text-muted-foreground text-lg">
                Search for any username and check its availability and price
              </p>
            </div>
            <UsernameSearch />
          </section>

          {/* Top Usernames Section */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Premium Usernames
              </h2>
              <p className="text-muted-foreground text-lg">
                Exclusive short usernames available for purchase
              </p>
            </div>
            <TopUsernames />
          </section>

          {/* Pricing Info Section */}
          <section className="bg-muted/50 rounded-lg p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Pricing Structure
              </h3>
              <p className="text-muted-foreground">
                All prices are in Telegram Stars
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {[
                { length: "1 letter", price: "2000", stars: "⭐⭐⭐⭐⭐" },
                { length: "2 letters", price: "1750", stars: "⭐⭐⭐⭐" },
                { length: "3 letters", price: "1500", stars: "⭐⭐⭐" },
                { length: "4 letters", price: "1250", stars: "⭐⭐⭐" },
                { length: "5 letters", price: "1000", stars: "⭐⭐" },
                { length: "6 letters", price: "600", stars: "⭐⭐" },
                { length: "7 letters", price: "400", stars: "⭐" },
                { length: "8 letters", price: "200", stars: "⭐" },
                { length: "9+ letters", price: "100", stars: "⭐" },
              ].map((item, index) => (
                <div key={index} className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-foreground mb-2">{item.length}</div>
                  <div className="text-lg font-semibold text-primary mb-1">{item.price} stars</div>
                  <div className="text-yellow-500 text-sm">{item.stars}</div>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-8">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">1</div>
                <h4 className="font-semibold text-foreground">Search Username</h4>
                <p className="text-muted-foreground text-sm">
                  Check if your desired username is available
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">2</div>
                <h4 className="font-semibold text-foreground">See Price</h4>
                <p className="text-muted-foreground text-sm">
                  Get the price in Telegram Stars based on username length
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">3</div>
                <h4 className="font-semibold text-foreground">Contact CEO</h4>
                <p className="text-muted-foreground text-sm">
                  Message our CEO on Telegram to complete purchase
                </p>
              </div>
            </div>
          </section>
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
