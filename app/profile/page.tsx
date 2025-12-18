import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, User, ShoppingBasket, MessageSquareMore, Edit, Check, Sparkles, Paintbrush, Crown, Star, Zap, Coins, Shield } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CustomizationModal from "@/components/customization-modal"

// Карта алиасов пользователей
const userAliases: Record<string, string[]> = {
  "nikolaev": ["azya", "nklv"],
  "gerxog": ["tech"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv", "bolt"],
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

// Получить активные кастомизации пользователя
async function getUserCustomizations(userId: string) {
  const supabase = await createClient()
  
  const { data: customizations } = await supabase
    .from("user_customizations")
    .select(`
      *,
      customization_items (*)
    `)
    .eq("user_id", userId)
    .eq("is_active", true)

  return customizations || []
}

// Функция для обновления очков на основе проблем
// Функция для обновления очков на основе проблем
async function updateUserPointsBasedOnProblems(userId: string, problemCount: number) {
  const supabase = await createClient()
  
  const calculatedPoints = problemCount * 10
  
  try {
    // Получаем текущие очки из базы
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single()

    // Если очки уже соответствуют расчетным, ничего не делаем
    if (profile?.points === calculatedPoints) {
      return calculatedPoints
    }

    // Обновляем очки в базе
    const { error } = await supabase
      .from("profiles")
      .update({ 
        points: calculatedPoints,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating points:", error)
      return profile?.points || calculatedPoints
    }

    return calculatedPoints
  } catch (error) {
    console.error("Error in updateUserPointsBasedOnProblems:", error)
    return calculatedPoints
  }
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Список подтвержденных пользователей
  const verifiedUsers = ["startorigin", "winter", "nikolaev", "gerxog"]
  const isVerifiedUser = profile?.username ? verifiedUsers.includes(profile.username) : false

  // Получаем все username для отображения (статические + из базы данных)
  const allUsernames = profile?.username 
    ? await getAllUsernamesCombined(profile.username, user.id)
    : []

  // Получаем активные кастомизации
  const activeCustomizations = await getUserCustomizations(user.id)

  // Fetch user's problems
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

  // Рассчитываем очки на основе количества проблем
  const problemCount = problems?.length || 0
  const calculatedPoints = problemCount * 10
  
  // Обновляем очки пользователя в базе данных
  const userPoints = await updateUserPointsBasedOnProblems(user.id, problemCount)

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Получить цвет рамки аватара из кастомизаций
  const getAvatarBorder = () => {
    const borderCustomization = activeCustomizations.find(
      c => c.customization_items?.type === 'avatar_border'
    )
    return borderCustomization?.customization_items?.value || ""
  }

  // Получить кастомный значок
  const getCustomBadge = () => {
    const badgeCustomization = activeCustomizations.find(
      c => c.customization_items?.type === 'badge'
    )
    return badgeCustomization?.customization_items
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Points Display - Minimal */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-900">Your Points</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-amber-700">{userPoints}</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        {problemCount} × 10 = {userPoints} points
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-600 mt-1">
                      {problemCount} problems × 10 points each
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CustomizationModal 
                    userId={user.id} 
                    currentPoints={userPoints}
                    activeCustomizations={activeCustomizations}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile</CardTitle>
                <div className="flex items-center gap-2">
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center gap-6">
                {/* Аватар с кастомизациями */}
                <div className="relative">
                  <div 
                    className={`h-32 w-32 rounded-full overflow-hidden border-4 bg-muted ${getAvatarBorder()}`}
                    style={{
                      borderStyle: getAvatarBorder().includes('gradient') ? 'solid' : undefined
                    }}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-3xl font-semibold text-muted-foreground">
                          {getInitials(profile?.display_name || profile?.username)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Галочка верификации */}
                  {isVerifiedUser && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-2 border-2 border-background">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  )}
                  
                  {/* Кастомный значок */}
                  {getCustomBadge() && (
                    <div className="absolute -top-2 -left-2">
                      <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                        {getCustomBadge()?.icon === 'crown' && <Crown className="h-3 w-3" />}
                        {getCustomBadge()?.icon === 'star' && <Star className="h-3 w-3" />}
                        {getCustomBadge()?.icon === 'zap' && <Zap className="h-3 w-3" />}
                        {getCustomBadge()?.name}
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground break-words">
                      {profile?.display_name || profile?.username || "Anonymous"}
                    </h2>
                    {isVerifiedUser && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        <Check className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  {/* Отображаем все username через запятую */}
                  {allUsernames.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {allUsernames.map((userName, index) => (
                        <span key={userName} className="text-muted-foreground">
                          @{userName}
                          {index < allUsernames.length - 1 && <span>, </span>}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  
                  {profile?.bio && (
                    <p className="mt-4 text-foreground max-w-2xl">{profile.bio}</p>
                  )}
                  
                  {/* Статистика */}
                  <div className="flex justify-center gap-6 pt-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-primary">{problemCount}</div>
                      <div className="text-xs text-muted-foreground">Problems</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{userPoints}</div>
                      <div className="text-xs text-muted-foreground">Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-purple-600">{activeCustomizations.length}</div>
                      <div className="text-xs text-muted-foreground">Customizations</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User's Problems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Problems ({problemCount})</CardTitle>
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
                  <div className="mb-4 flex justify-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="mb-4">You haven't shared any problems yet.</p>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Share Your First Problem
                    </Button>
                  </Link>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Each problem gives you <span className="font-bold text-amber-600">10 points</span>!
                  </p>
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
