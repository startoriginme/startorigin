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

// Карта алиасов пользователей
const userAliases: Record<string, string[]> = {
  "nikolaev": ["maxnikolaev", "maxnklv", "azya", "nklv"],
  "gerxog": ["admin"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv", "bolt"]
}

// Функция для получения основного username по алиасу
function getMainUsername(username: string): string {
  for (const [mainUsername, aliases] of Object.entries(userAliases)) {
    if (mainUsername === username || aliases.includes(username)) {
      return mainUsername
    }
  }
  return username
}

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string): string[] {
  return [mainUsername, ...(userAliases[mainUsername] || [])]
}

// Функция для получения алиасов из базы данных
async function getDatabaseAliases(userId: string): Promise<string[]> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from("user_aliases")
      .select("alias")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching database aliases:", error)
      return []
    }

    return data?.map(item => item.alias) || []
  } catch (err) {
    console.error("Error fetching database aliases:", err)
    return []
  }
}

// Функция для объединения статических и базы данных алиасов
async function getAllUsernamesCombined(mainUsername: string, userId: string): Promise<string[]> {
  const staticAliases = getAllUsernames(mainUsername)
  
  try {
    const databaseAliases = await getDatabaseAliases(userId)
    
    // Объединяем и убираем дубликаты
    const allAliases = [...staticAliases]
    databaseAliases.forEach(alias => {
      if (!allAliases.includes(alias)) {
        allAliases.push(alias)
      }
    })
    
    return allAliases
  } catch (err) {
    console.error("Error combining aliases:", err)
    return staticAliases
  }
}

// Функция для получения профиля по username или алиасу
async function getProfileByUsernameOrAlias(username: string) {
  const supabase = await createClient()
  
  // Сначала ищем в базе данных по алиасам
  const { data: aliasData, error: aliasError } = await supabase
    .from("user_aliases")
    .select("user_id")
    .eq("alias", username)
    .single()

  if (!aliasError && aliasData) {
    // Если нашли в алиасах, получаем профиль пользователя
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", aliasData.user_id)
      .single()

    if (!profileError && profileData) {
      return profileData
    }
  }

  // Если не нашли в алиасах, ищем по основному username
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single()

  if (!profileError && profileData) {
    return profileData
  }

  // Если не нашли в базе, проверяем статическую карту
  for (const [mainUsername, aliases] of Object.entries(userAliases)) {
    if (mainUsername === username || aliases.includes(username)) {
      // Ищем профиль по основному username
      const { data: staticProfileData, error: staticError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", mainUsername)
        .single()

      if (!staticError && staticProfileData) {
        return staticProfileData
      }
    }
  }

  return null
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // Получаем текущего пользователя (но не редиректим если не залогинен)
  const { data: { user } } = await supabase.auth.getUser()

  // Получаем профиль по username или алиасу
  const profile = await getProfileByUsernameOrAlias(username)

  if (!profile) {
    notFound()
  }

  // Если пользователь залогинен и пытается посмотреть СВОЙ профиль - редиректим на /profile
  if (user && user.id === profile.id) {
    redirect("/profile")
  }

  // Fetch current user's profile for avatar (только если пользователь залогинен)
  let currentUserProfile = null
  if (user) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("avatar_url, display_name, username")
      .eq("id", user.id)
      .single()
    currentUserProfile = currentProfile
  }

  // Список подтвержденных пользователей (используем username профиля)
  const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]
  const isVerifiedUser = profile.username ? verifiedUsers.includes(profile.username) : false

  // Получаем все username для отображения (статические + из базы данных)
  const allUsernames = profile.username 
    ? await getAllUsernamesCombined(profile.username, profile.id)
    : []

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
            <div className="flex items-center gap-4">
              {/* Бургер меню для всех устройств */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:w-[280px]">
                  <div className="flex flex-col gap-6 py-6">
                    <div className="flex items-center gap-2 px-2">
                      <Lightbulb className="h-6 w-6 text-primary" />
                      <span className="text-xl font-bold">StartOrigin</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link 
                        href="https://telegra.ph/StartOrigin-11-25" 
                        className="flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-accent"
                        onClick={() => setSidebarOpen(false)}
                      >
                        About
                      </Link>
                       <Link 
                        href="https://telegra.ph/Advertise-and-get-verified-on-StartOrigin-11-25" 
                        className="flex items-center gap-2 px-2 py-2 text-sm rounded-lg hover:bg-accent bg-accent"
                        onClick={() => setSidebarOpen(false)}
                      >
                        Pro Features
                      </Link>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">StartOrigin</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Share Problem</span>
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
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="hidden sm:flex">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="hidden sm:flex">Get Started</Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="sm:hidden">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/auth/login" className="cursor-pointer">Sign In</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/sign-up" className="cursor-pointer">Get Started</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              <div className="flex flex-col items-center text-center gap-4">
                {/* Кастомный аватар без сжатия */}
                <div className="relative">
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
                
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
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
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {allUsernames.map((userName, index) => (
                      <span key={userName} className="text-muted-foreground">
                        @{userName}
                        {index < allUsernames.length - 1 && <span>, </span>}
                      </span>
                    ))}
                  </div>
                  
                  {profile?.bio && (
                    <p className="mt-4 text-foreground max-w-2xl">{profile.bio}</p>
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
