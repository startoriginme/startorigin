import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, Calendar, MessageSquare, ArrowBigUp, Edit, User, Check } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Карта алиасов пользователей
const userAliases: Record<string, string[]> = {
  "nikolaev": ["maxnikolaev", "maxnklv", "azya", "nklv"],
  "gerxog": ["admin"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv"],
}

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string): string[] {
  return [mainUsername, ...(userAliases[mainUsername] || [])]
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Список подтвержденных пользователей
  const verifiedUsers = ["startorigin", "winter", "nikolaev", "gerxog"]
  const isVerifiedUser = profile?.username ? verifiedUsers.includes(profile.username) : false

  // Получаем все username для отображения
  const allUsernames = profile?.username ? getAllUsernames(profile.username) : []

  // Fetch user's problems with profiles data
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
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })

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
            </div>

            {/* Mobile Navigation - hidden on desktop */}
            <div className="flex items-center gap-2 md:hidden">
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
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile</CardTitle>
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
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
                  
                  {/* Отображаем все username через запятую */}
                  {allUsernames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {allUsernames.map((userName, index) => (
                        <span key={userName} className="text-muted-foreground">
                          @{userName}
                          {index < allUsernames.length - 1 && <span>, </span>}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
                  {profile?.bio && <p className="mt-4 text-foreground">{profile.bio}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User's Problems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Problems ({problems?.length || 0})</CardTitle>
                <Link href="/problems/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Problem
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {problems && problems.length > 0 ? (
                <div className="space-y-4">
                  {problems.map((problem) => (
                    <ProblemCard 
                      key={problem.id} 
                      problem={problem} 
                      userId={user.id} 
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="mb-4">You haven't shared any problems yet.</p>
                  <Link href="/problems/new">
                    <Button>Share Your First Problem</Button>
                  </Link>
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
