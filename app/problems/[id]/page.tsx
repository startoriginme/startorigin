import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemDetail } from "@/components/problem-detail"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowLeft, LogOut, User, ShoppingBasket, MessageSquareMore, LogIn } from "lucide-react"
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

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  // Используем публичный клиент для получения данных проблемы
  const publicSupabase = await createPublicSupabase()

  const { data: problem, error } = await publicSupabase
    .from("problems")
    .select(
      `*,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )`
    )
    .eq("id", id)
    .single()

  if (error || !problem) {
    notFound()
  }

  // Для пользовательских данных используем обычный клиент в try-catch
  let user = null
  let userProfile = null
  let hasUpvoted = false

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

      // Проверяем апвоут только если пользователь авторизован
      const { data: upvote } = await regularSupabase
        .from("upvotes")
        .select("id")
        .eq("problem_id", id)
        .eq("user_id", user.id)
        .single()

      hasUpvoted = !!upvote
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

        <ProblemDetail
          problem={problem}
          userId={user?.id}
          initialHasUpvoted={hasUpvoted}
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
