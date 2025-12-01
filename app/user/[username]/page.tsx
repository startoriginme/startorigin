"use client"

import { createClient } from "@/lib/supabase/client"
import { ChatModal } from "@/components/chat-modal"
import { useState, useEffect } from "react"
import { notFound, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Lightbulb, Plus, ArrowLeft, LogOut, User, Check, MessageCircle, Bell } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

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
  const [showChatsModal, setShowChatsModal] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [problems, setProblems] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [allUsernames, setAllUsernames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set())
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set())
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const router = useRouter()

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (shouldRedirect) {
      router.push("/profile")
    }
  }, [shouldRedirect, router])

  useEffect(() => {
    if (currentUser) {
      // Подписываемся на изменения в таблице messages
      const channel = supabase
        .channel('unread-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `recipient_id=eq.${currentUser.id}`,
          },
          (payload) => {
            // При любом изменении сообщений обновляем счетчики
            loadUnreadMessagesCount()
            loadUnreadChats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser])

  const loadUnreadMessagesCount = async () => {
    if (!currentUser) return

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUser.id)
        .eq('is_read', false)

      console.log('Unread messages count:', count, error)
      
      if (!error && count !== null) {
        setUnreadMessagesCount(count)
      } else if (error) {
        console.error('Error loading unread messages count:', error)
      }
    } catch (error) {
      console.error('Error in loadUnreadMessagesCount:', error)
    }
  }

  const loadUnreadChats = async () => {
    if (!currentUser) return

    try {
      // Получаем уникальных отправителей с непрочитанными сообщениями
      const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', currentUser.id)
        .eq('is_read', false)

      console.log('Unread chats data:', data, error)
      
      if (!error && data) {
        const senderIds = new Set(data.map(msg => msg.sender_id))
        console.log('Unread sender IDs:', Array.from(senderIds))
        setUnreadChats(senderIds)
      } else if (error) {
        console.error('Error loading unread chats:', error)
      }
    } catch (error) {
      console.error('Error in loadUnreadChats:', error)
    }
  }

  const loadData = async () => {
    try {
      const { username } = await params
      
      console.log('Loading profile for username:', username)
      
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)
      setCurrentUser(user)

      if (user) {
        console.log('Loading unread messages for user:', user.id)
        await loadUnreadMessagesCount()
        await loadUnreadChats()
      }

      // Получаем профиль по username или алиасу
      const profileData = await getProfileByUsernameOrAlias(username)
      console.log('Found profile:', profileData)
      
      if (!profileData) {
        console.log('Profile not found')
        notFound()
        return
      }

      setProfile(profileData)

      // Проверяем, является ли этот профиль профилем текущего пользователя
      if (user) {
        console.log('Checking if profile belongs to current user')
        console.log('User ID:', user.id, 'Profile ID:', profileData.id)
        
        // Сначала проверяем по прямому ID
        if (user.id === profileData.id) {
          console.log('Redirecting: same user ID')
          setShouldRedirect(true)
          return
        }

        // Затем проверяем по username и алиасам текущего пользователя
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name, username")
          .eq("id", user.id)
          .single()
        
        console.log('Current user profile:', currentProfile)
        setCurrentUserProfile(currentProfile)

        if (currentProfile?.username) {
          const currentUserAllUsernames = await getAllUsernamesCombined(currentProfile.username, user.id)
          console.log('Current user all usernames:', currentUserAllUsernames)
          console.log('Requested username:', username)
          
          // Проверяем, совпадает ли запрошенный username с любым из username текущего пользователя
          if (currentUserAllUsernames.includes(username)) {
            console.log('Redirecting: username match')
            setShouldRedirect(true)
            return
          }
        }
      }

      console.log('No redirect needed, loading profile data')

      // Если редирект не нужен, продолжаем загрузку данных
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
    console.log('Searching for profile with username/alias:', username)
    
    // Сначала ищем в базе данных по алиасам
    const { data: aliasData, error: aliasError } = await supabase
      .from("user_aliases")
      .select("user_id")
      .eq("alias", username)
      .single()

    console.log('Alias search result:', aliasData, aliasError)

    if (!aliasError && aliasData) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", aliasData.user_id)
        .single()

      console.log('Profile by alias result:', profileData, profileError)

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

    console.log('Profile by username result:', profileData, profileError)

    if (!profileError && profileData) {
      return profileData
    }

    // Если не нашли в базе, проверяем статическую карту
    for (const [mainUsername, aliases] of Object.entries(userAliases)) {
      if (mainUsername === username || aliases.includes(username)) {
        console.log('Found in static map, main username:', mainUsername)
        
        const { data: staticProfileData, error: staticError } = await supabase
          .from("profiles")
          .select("*")
          .eq("username", mainUsername)
          .single()

        console.log('Static profile result:', staticProfileData, staticError)

        if (!staticError && staticProfileData) {
          return staticProfileData
        }
      }
    }

    console.log('Profile not found in any method')
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

  // Если нужно редиректить, показываем ничего или лоадер
  if (shouldRedirect) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to your profile...</p>
        </div>
      </div>
    )
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

  // Список подтвержденных пользователей
  const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]
  const isVerifiedUser = profile.username ? verifiedUsers.includes(profile.username) : false

  console.log('Rendering profile. Unread messages:', unreadMessagesCount)
  console.log('Unread chats for this profile:', unreadChats.has(profile.id))

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

                  {currentUser && currentUser.id !== profile.id && (
                    <div className="mt-6">
                      <Button 
                        onClick={() => setShowChatModal(true)}
                        className="gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Start a Chat
                        {unreadChats.has(profile.id) && (
                          <Badge 
                            className="ml-1 h-5 w-5 flex items-center justify-center p-0 bg-blue-500 text-white"
                            variant="default"
                          >
                            !
                          </Badge>
                        )}
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

      {/* Модальное окно чата с конкретным пользователем */}
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
          hasUnreadMessages={unreadChats.has(profile.id)}
        />
      )}

      {/* Модальное окно всех чатов */}
      {showChatsModal && currentUser && (
        <ChatModal
          isOpen={showChatsModal}
          onClose={() => setShowChatsModal(false)}
          recipientUser={{
            id: "",
            username: "all-chats",
            display_name: "All Chats", 
            avatar_url: null
          }}
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
