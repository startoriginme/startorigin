import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProjectDetail } from "@/components/project-detail"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowLeft, LogOut, User, Briefcase } from "lucide-react"
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
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logoutAction } from "@/app/actions/auth" // Импортируем Server Action из отдельного файла

// Создаем публичный клиент Supabase без проверки аутентификации
async function createPublicSupabase() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Игнорируем ошибки установки кук
          }
        },
      },
    }
  )
}

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string, authorId: string): string[] {
  // Карта статических алиасов
  const userAliases: Record<string, string[]> = {
    "nikolaev": ["azya", "nklv"],
    "gerxog": ["admin", "tech"],
    "startorigin": ["problems"],
    "winter": ["zima", "vlkv", "bolt"]
  }
  
  const staticAliases = [mainUsername, ...(userAliases[mainUsername] || [])]
  
  // В реальном приложении здесь нужно добавить запрос к базе данных
  // для получения алиасов из таблицы user_aliases по authorId
  // const databaseAliases = await getDatabaseAliases(authorId)
  
  return staticAliases
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Используем публичный клиент для получения данных проекта
  const publicSupabase = await createPublicSupabase()

  const { data: project, error } = await publicSupabase
    .from("projects")
    .select(
      `*,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        bio,
        website,
        disable_chat
      )`
    )
    .eq("id", id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Получаем все ники автора (основной + алиасы)
  const allUsernames = project.profiles?.username 
    ? getAllUsernames(project.profiles.username, project.author_id)
    : []

  // Для пользовательских данных используем обычный клиент в try-catch
  let user = null
  let userProfile = null

  try {
    // Пытаемся получить данные пользователя, но не падаем при ошибке
    const regularSupabase = await createClient()
    const {
      data: { user: authUser },
    } = await regularSupabase.auth.getUser()
    user = authUser

    if (user) {
      // Получаем профиль пользователя
      const { data: profile } = await regularSupabase
        .from("profiles")
        .select("avatar_url, display_name, username")
        .eq("id", user.id)
        .single()
      userProfile = profile
    }
  } catch (error) {
    // Игнорируем ошибки аутентификации - страница доступна без логина
    console.log("User is not authenticated, but page is still accessible")
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
                        {/* Используем импортированную Server Action */}
                        <form action={logoutAction} className="w-full">
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
                        {/* Используем импортированную Server Action */}
                        <form action={logoutAction} className="w-full">
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
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Projects</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        <ProjectDetail
          project={project}
          userId={user?.id}
          allUsernames={allUsernames}
        />
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
