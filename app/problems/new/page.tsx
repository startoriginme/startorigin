import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemForm } from "@/components/problem-form"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, LogOut, User, ArrowRight, Zap, ShoppingBasket, MessageSquareMore, LogIn } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default async function NewProblemPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile for avatar
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name, username")
    .eq("id", user.id)
    .single()

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
      <header className="border-b border-border bg-card relative">
        <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden z-0">
          <div className="flex justify-center">
            <div className="relative h-4 flex">
              <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-gray-400/30"></div>
              
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i}
                  className="relative mx-1"
                  style={{
                    animationDelay: `${i * 0.15}s`
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    i % 3 === 0 ? 'bg-red-500 animate-pulse' :
                    i % 3 === 1 ? 'bg-green-500 animate-pulse' :
                    'bg-yellow-500 animate-pulse'
                  }`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/70 blur-sm ${
                    i % 3 === 0 ? 'animate-pulse' :
                    i % 3 === 1 ? 'animate-pulse delay-75' :
                    'animate-pulse delay-150'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-4 relative z-10">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 relative hover:opacity-90 transition-opacity">
              <span className="text-2xl font-black uppercase tracking-tighter font-montserrat text-foreground">
                STARTORIGIN
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-3">
              {/* Кнопка Marketplace */}
              <Link href="https://startorigin.me/marketplace" target="_blank">
                <Button variant="outline" className="gap-2">
                  <ShoppingBasket className="h-4 w-4" />
                  Marketplace
                </Button>
              </Link>

              {/* Кнопка Chat - просто ссылка */}
              <Link href="https://startorigin.me/user/chat">
                <Button variant="outline" className="gap-2">
                  <MessageSquareMore className="h-4 w-4" />
                  Chat
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Share Problem
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={profile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(profile?.display_name || profile?.username)}
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
                // Только одна кнопка Login с иконкой на десктопе
                <Link href="/auth/login">
                  <Button size="icon" variant="outline" className="h-10 w-10">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {/* Мобильная версия кнопок */}
              <Link href="https://startorigin.me/marketplace" target="_blank">
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <ShoppingBasket className="h-4 w-4" />
                </Button>
              </Link>

              {/* Мобильная версия Chat - просто ссылка */}
              <Link href="https://startorigin.me/user/chat">
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <MessageSquareMore className="h-4 w-4" />
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button size="icon" className="h-9 w-9">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={profile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(profile?.display_name || profile?.username)}
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
                // Только одна кнопка Login с иконкой на мобиле
                <Link href="/auth/login">
                  <Button size="icon" variant="outline" className="h-9 w-9">
                    <LogIn className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>
      {/* CTA Banner under header */}
      <div className="bg-gradient-to-r from-mint/20 to-teal-100/30 border-b border-mint/30 py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-800">
                Take the test to evaluate your startup potential
              </span>
            </div>
            <Link href="https://startorigin.me/test" className="w-full sm:w-auto">
              <Button 
                size="sm" 
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 w-full sm:w-auto text-xs py-1 h-8"
              >
                Take the Test
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Share a Problem</h1>
            <p className="text-muted-foreground">
              Describe a challenge you&apos;re facing. Be specific and provide context to help others understand the
              problem.
            </p>
          </div>

          <ProblemForm userId={user.id} />
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
