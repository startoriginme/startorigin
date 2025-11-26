"use client"

import { createClient } from "@/lib/supabase/client"
import { ChatModal } from "@/components/chat-modal"
import { useState, useEffect } from "react"
import { notFound, redirect, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Lightbulb, Plus, ArrowLeft, LogOut, User, Check, MessageCircle } from "lucide-react"
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
  "nikolaev": ["azya", "nklv"],
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

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
  const [showChatModal, setShowChatModal] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [allUsernames, setAllUsernames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set())
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { username } = await params
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Получаем профиль по username или алиасу
      const profileData = await getProfileByUsernameOrAlias(username)
      if (!profileData) {
        notFound()
        return
      }

      setProfile(profileData)

      // Если пользователь залогинен и пытается посмотреть СВОЙ профиль - редиректим на /profile
      if (user && user.id === profileData.id) {
        redirect("/profile")
        return
      }

      // Fetch current user's profile for avatar (только если пользователь залогинен)
      if (user) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name, username")
          .eq("id", user.id)
          .single()
        setCurrentUserProfile(currentProfile)
      }

      // Получаем все username для отображения (статические + из базы данных)
      const usernames = profileData.username 
        ? await getAllUsernamesCombined(profileData.username, profileData.id)
        : []
      setAllUsernames(usernames)

      // Fetch user's public problems
      const { data: problemsData } = await supabase
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
        .eq("author_id", profileData.id)
        .order("created_at", { ascending: false })

      setProblems(problemsData || [])

      // Fetch upvotes for current user if logged in
      if (user) {
        const { data: upvotes } = await supabase
          .from("upvotes")
          .select("problem_id")
          .eq("user_id", user.id)
        
        if (upvotes) {
          setUserUpvotes(new Set(upvotes.map(upvote => upvote.problem_id)))
        }
      }

    } catch (error) {
      console.error("Error loading profile data:", error)
      notFound()
    } finally {
      setIsLoading(false)
    }
  }

  // Функция для получения алиасов из базы данных
  const getDatabaseAliases = async (userId: string): Promise<string[]> => {
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
  const getAllUsernamesCombined = async (mainUsername: string, userId: string): Promise<string[]> => {
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
  const getProfileByUsernameOrAlias = async (username: string) => {
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    notFound()
  }

  // Список подтвержденных пользователей (используем username профиля)
  const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]
  const isVerifiedUser = profile.username ? verifiedUsers.includes(profile.username) : false

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">StartOrigin</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {currentUser ? (
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
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer">
                        <LogOut className="h-4 w-4" />
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
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {getInitials(profile.display_name || profile.username)}
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
                      {profile.display_name || profile.username || "Anonymous"}
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
                  
                  {profile.bio && (
                    <p className="mt-4 text-foreground max-w-2xl">{profile.bio}</p>
                  )}

                  {/* Кнопка Start a Chat */}
                  {currentUser && currentUser.id !== profile.id && (
                    <div className="mt-6">
                      <Button 
                        onClick={() => setShowChatModal(true)}
                        className="gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Start a Chat
                      </Button>
                    </div>
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
                      userId={currentUser?.id}
                      initialHasUpvoted={userUpvotes.has(problem.id)}
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

      {/* Модальное окно чата */}
      {showChatModal && currentUser && (
        <ChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          recipientUser={profile}
          currentUser={{
            id: currentUser.id,
            username: currentUserProfile?.username,
            display_name: currentUserProfile?.display_name,
            avatar_url: currentUserProfile?.avatar_url
          }}
        />
      )}

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
