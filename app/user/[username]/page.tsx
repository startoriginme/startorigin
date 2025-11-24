import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Lightbulb, Plus, ArrowLeft, LogOut, User, Check } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PublicProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // Получаем текущего пользователя (но не редиректим если не залогинен)
  const { data: { user } } = await supabase.auth.getUser()

  // Если пользователь залогинен и пытается посмотреть свой профиль - редиректим на /profile
  if (user) {
    // Сначала получаем username текущего пользователя
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single()

    // Если username совпадает - редиректим
    if (currentUserProfile?.username === username) {
      redirect("/profile")
    }
  }

  // Fetch current user's profile for avatar (только если пользователь залогинен)
  let currentUserProfile = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", user.id)
      .single()
    currentUserProfile = profile
  }

  // Fetch user profile by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single()

  if (!profile) {
    notFound()
  }

  // Список подтвержденных пользователей
  const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]
  const isVerifiedUser = verifiedUsers.includes(profile.username)

  // Fetch user's public problems
  const { data: problems } = await supabase
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
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })

  // Fetch upvotes for current user if logged in
  let userUpvotes: Set<string> = new Set()
  if (user) {
    const { data: upvotes } = await supabase
      .from("upvotes")
      .select("problem_id")
      .eq("user_id", user.id)
    
    if (upvotes) {
      userUpvotes = new Set(upvotes.map(upvote => upvote.problem_id))
    }
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

  // Server action for logout (только для залогиненных пользователей)
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
                            src={currentUserProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(currentUserProfile?.display_name || currentUserProfile?.username)}
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
                            src={currentUserProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(currentUserProfile?.display_name || currentUserProfile?.username)}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/problems">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Problems</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        <div className="mx-auto max-w-4xl space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Кастомный аватар без сжатия */}
                <div className="relative h-24 w-24">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {getInitials(profile?.display_name || profile?.username)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Галочка верификации */}
                  {isVerifiedUser && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-background">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground break-words">
                      {profile?.display_name || profile?.username || "Anonymous"}
                    </h2>
                    {isVerifiedUser && (
                      <div className="text-blue-500 flex-shrink-0" title="Verified">
                        <Check className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  {profile?.username && (
                    <p className="text-muted-foreground">@{profile.username}</p>
                  )}
                  {profile?.bio && (
                    <p className="mt-4 text-foreground">{profile.bio}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User's Problems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {problems?.length === 1 ? "1 Problem" : `${problems?.length || 0} Problems`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {problems && problems.length > 0 ? (
                <div className="space-y-4">
                  {problems.map((problem) => (
                    <ProblemCard 
                      key={problem.id} 
                      problem={problem} 
                      userId={user?.id} // Передаем ID пользователя (может быть undefined)
                      initialHasUpvoted={userUpvotes.has(problem.id)} // Передаем информацию о лайках
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No problems shared yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
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
