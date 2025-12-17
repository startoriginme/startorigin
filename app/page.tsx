import { createClient } from "@/lib/supabase/server"
import { ProblemsFeed } from "@/components/problems-feed"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowRight, LogOut, User, ChevronLeft, ChevronRight, ExternalLink, MessageCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image" // Добавьте этот импорт
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { redirect } from "next/navigation"
import { HeroCarousel } from "@/components/hero-carousel"

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch limited problems (4 for initial load)
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
    .limit(4) // Ограничиваем начальную загрузку 4 проблемами

  if (error) {
    console.error("Error fetching problems:", error)
  }

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

  // Hero slides data
  const heroSlides = [
    {
      id: 1,
      title: "Marketplace (Beta)",
      description: "Buy collectible usernames",
      buttonText: "Buy some",
      buttonVariant: "outline" as const,
      link: "https://startorigin.me/marketplace",
      openInNewTab: false
    },
    {
      id: 2,
      title: "OriginChat (Beta)",
      description: "Chat with StartOrigin users on the platform.",
      buttonText: "Open Chat",
      buttonVariant: "outline" as const,
      link: "https://startorigin.me/user/chat",
      openInNewTab: false
    },
    {
      id: 3,
      title: "Origin AI",
      description: "Your AI friend that truly understands you",
      buttonText: "Try AI Chat",
      buttonVariant: "outline" as const,
      link: "https://chat.startorigin.me/",
      openInNewTab: true
    },
    {
      id: 4,
      title: "It's Winter!",
      description: "Stream on Winter's channel",
      buttonText: "Subscribe",
      buttonVariant: "outline" as const,
      link: "https://t.me/winter_devs",
      openInNewTab: true
    }
  ]

  // Solutions data
  const solutions = [
    {
      id: 1,
      title: "Add your solution",
      description: "Contact @nklv for publishing your project here.",
      buttonText: "Publish",
      link: "https://startorigin.me/user/nklv",
      openInNewTab: true,
      icon: MessageCircle
    },
    {
      id: 2,
      title: "AdPage (vibe-coded MVP)",
      description: "Structured list of ads. Solves",
      problemText: "@djuni_djuni's problem",
      problemLink: "https://startorigin.me/problems/32fab6d4-4d9d-48f1-8019-fc043012b373",
      buttonText: "View Website",
      link: "https://adpage-service.vercel.app/",
      openInNewTab: true,
      icon: ExternalLink
    }
  ]

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
            {/* Заменено: вместо лампочки и текста - изображение Discord-иконки */}
            <Link href="/" className="flex items-center gap-2 relative">
              <div className="relative h-8 w-8">
                <Image
                  src="https://cdn.discordapp.com/icons/1448659723695165442/703beda9ab12ebff8e9a6940e253d3fa.webp?size=64"
                  alt="StartOrigin Logo"
                  fill
                  className="rounded-full object-cover"
                  sizes="32px"
                  priority
                />
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-4">
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

            <div className="flex items-center gap-2 md:hidden">
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

      <section className="border-b border-border bg-white">
        <div className="container mx-auto px-4 h-[232px] flex items-center justify-center">
          <HeroCarousel slides={heroSlides} />
        </div>
      </section>

      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Explore Problems</h2>
          <p className="text-muted-foreground">Discover problems from the community</p>
        </div>

        {/* ProblemsFeed теперь сам управляет пагинацией */}
        <ProblemsFeed 
          initialProblems={problems || []} 
          userId={user?.id}
        />

        {/* Solutions Section */}
        <section className="mt-12 mb-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Solutions that solved a problem from StartOrigin</h2>
            <p className="text-muted-foreground">Real-world projects built to solve community problems</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {solutions.map((solution) => (
              <div 
                key={solution.id} 
                className="border border-border rounded-lg p-6 bg-card hover:bg-card/80 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <solution.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {solution.title}
                    </h3>
                  </div>
                </div>

                <p className="text-muted-foreground mb-4">
                  {solution.description}
                  {solution.problemText && (
                    <Link 
                      href={solution.problemLink || "#"} 
                      target="_blank"
                      className="text-primary hover:underline ml-1"
                    >
                      {solution.problemText}
                    </Link>
                  )}
                </p>

                <div className="flex justify-end">
                  <Link href={solution.link} target={solution.openInNewTab ? "_blank" : "_self"}>
                    <Button variant="outline" className="gap-2">
                      {solution.buttonText}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Future Navigation Placeholder */}
          <div className="flex justify-center items-center gap-2 text-muted-foreground text-sm">
            <Button variant="ghost" size="icon" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>More solutions coming soon...</span>
            <Button variant="ghost" size="icon" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

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
