import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, User, ArrowLeft, Share2, Download, LogIn, ShoppingBasket, MessageSquareMore, Edit, Check, Star, Crown, Sparkles, Paintbrush, Gift, ShoppingCart, Trophy, Zap, Coins, Gem } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

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

// Получить доступные предметы в магазине
async function getShopItems() {
  const supabase = await createClient()
  
  const { data: items } = await supabase
    .from("customization_items")
    .select("*")
    .order("price")

  return items || []
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile with points
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

  // Получаем предметы из магазина
  const shopItems = await getShopItems()

  // Проверяем, что поле points существует (если нет, используем 0)
  const userPoints = profile.points || 0

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

  // Получить цвет рамки аватара из кастомизаций
  const getAvatarBorder = () => {
    const borderCustomization = activeCustomizations.find(
      c => c.customization_items?.type === 'avatar_border'
    )
    return borderCustomization?.customization_items?.value || ""
  }

  // Получить цвет фона профиля
  const getProfileBackground = () => {
    const bgCustomization = activeCustomizations.find(
      c => c.customization_items?.type === 'profile_background'
    )
    return bgCustomization?.customization_items?.value || ""
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

  // Server action for purchasing an item
  async function purchaseItem(itemId: string) {
    "use server"
    const supabase = await createClient()

    // Получаем данные пользователя
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      throw new Error("Not authenticated")
    }

    // Получаем информацию о предмете
    const { data: item } = await supabase
      .from("customization_items")
      .select("*")
      .eq("id", itemId)
      .single()

    if (!item) {
      throw new Error("Item not found")
    }

    // Проверяем, достаточно ли очков
    const { data: profile } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userData.user.id)
      .single()

    if (!profile || profile.points < item.price) {
      throw new Error("Not enough points")
    }

    // Начинаем транзакцию
    // 1. Вычитаем очки
    await supabase
      .from("profiles")
      .update({ points: profile.points - item.price })
      .eq("id", userData.user.id)

    // 2. Добавляем запись о покупке
    await supabase
      .from("user_customizations")
      .insert({
        user_id: userData.user.id,
        item_id: itemId,
        purchased_at: new Date().toISOString(),
        is_active: true
      })

    // 3. Создаем запись в истории транзакций
    await supabase
      .from("point_transactions")
      .insert({
        user_id: userData.user.id,
        points: -item.price,
        type: "spent",
        description: `Purchased: ${item.name}`,
        created_at: new Date().toISOString()
      })

    revalidatePath("/profile")
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
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Points Display Card */}
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-100">
                    <Coins className="h-8 w-8 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-900">Your Points</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-amber-700">{userPoints}</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Points
                      </Badge>
                    </div>
                    <p className="text-sm text-amber-600 mt-1">
                      Earn points by publishing problems and being active!
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-300">
                      <Plus className="h-3 w-3 mr-1" />
                      +10 points per problem
                    </Badge>
                    <Link href="/problems/new">
                      <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
                        <Plus className="h-4 w-4" />
                        Publish Problem
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-amber-600 text-center md:text-right">
                    Spend points on customizations in the shop
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile and Customizations */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="customization" className="gap-2">
                <Paintbrush className="h-4 w-4" />
                Customization Shop
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Profile Information</CardTitle>
                    <Link href="/profile/edit">
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row items-start gap-6">
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
                            {getCustomBadge()?.icon === 'trophy' && <Trophy className="h-3 w-3" />}
                            {getCustomBadge()?.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    {/* Информация профиля */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
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
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {allUsernames.map((userName, index) => (
                              <span key={userName} className="text-muted-foreground">
                                @{userName}
                                {index < allUsernames.length - 1 && <span>, </span>}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                      </div>
                      
                      {profile?.bio && (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-foreground">{profile.bio}</p>
                        </div>
                      )}

                      {/* Статистика */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{problems?.length || 0}</div>
                          <div className="text-sm text-muted-foreground">Problems</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{userPoints}</div>
                          <div className="text-sm text-muted-foreground">Points</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{activeCustomizations.length}</div>
                          <div className="text-sm text-muted-foreground">Customizations</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-600">
                            {Math.floor(userPoints / 10)}
                          </div>
                          <div className="text-sm text-muted-foreground">Problems Worth</div>
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
                        Earn <span className="font-bold text-amber-600">10 points</span> for your first problem!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customization Shop Tab */}
            <TabsContent value="customization" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Paintbrush className="h-5 w-5" />
                        Customization Shop
                      </CardTitle>
                      <CardDescription>
                        Spend your points to customize your profile appearance
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <Coins className="h-3 w-3" />
                      {userPoints} points available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Активные кастомизации */}
                  {activeCustomizations.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Active Customizations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeCustomizations.map((custom) => (
                          <div key={custom.id} className="border rounded-lg p-4 bg-gradient-to-br from-green-50 to-emerald-50">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium text-green-800">{custom.customization_items?.name}</h4>
                                <p className="text-sm text-green-600">{custom.customization_items?.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="bg-green-100 text-green-700">
                                    Active
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Purchased: {new Date(custom.purchased_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="text-green-600">
                                {custom.customization_items?.icon === 'crown' && <Crown className="h-6 w-6" />}
                                {custom.customization_items?.icon === 'star' && <Star className="h-6 w-6" />}
                                {custom.customization_items?.icon === 'trophy' && <Trophy className="h-6 w-6" />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Магазин */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Available Items
                    </h3>
                    
                    {shopItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>No items available in the shop yet.</p>
                        <p className="text-sm">Check back later for new customizations!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {shopItems.map((item) => {
                          const isOwned = activeCustomizations.some(c => c.item_id === item.id)
                          const canAfford = userPoints >= item.price
                          
                          return (
                            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                              <CardContent className="p-0">
                                {/* Превью предмета */}
                                <div className={`p-6 flex items-center justify-center ${item.type === 'avatar_border' ? 'bg-gradient-to-br from-gray-50 to-gray-100' : 'bg-gradient-to-br from-blue-50 to-indigo-50'}`}>
                                  <div className="text-center">
                                    <div className="text-4xl mb-2">
                                      {item.icon === 'crown' && <Crown className="h-12 w-12 mx-auto text-amber-500" />}
                                      {item.icon === 'star' && <Star className="h-12 w-12 mx-auto text-yellow-500" />}
                                      {item.icon === 'trophy' && <Trophy className="h-12 w-12 mx-auto text-purple-500" />}
                                      {item.icon === 'gem' && <Gem className="h-12 w-12 mx-auto text-blue-500" />}
                                      {item.icon === 'zap' && <Zap className="h-12 w-12 mx-auto text-green-500" />}
                                    </div>
                                    {item.type === 'avatar_border' && (
                                      <div className="flex justify-center">
                                        <div className={`h-16 w-16 rounded-full border-4 ${item.value}`}>
                                          <div className="w-full h-full rounded-full bg-gray-200"></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="font-bold">{item.name}</h4>
                                      <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                    <Badge variant={isOwned ? "default" : "outline"} className={isOwned ? "bg-green-100 text-green-700 border-green-300" : ""}>
                                      {isOwned ? "Owned" : `${item.price} pts`}
                                    </Badge>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-4">
                                    <div className="text-xs text-muted-foreground">
                                      Type: <span className="font-medium">{item.type.replace('_', ' ')}</span>
                                    </div>
                                    
                                    {!isOwned ? (
                                      <form action={purchaseItem.bind(null, item.id)}>
                                        <Button 
                                          type="submit"
                                          size="sm"
                                          className="gap-2"
                                          disabled={!canAfford}
                                        >
                                          {canAfford ? (
                                            <>
                                              <ShoppingCart className="h-3 w-3" />
                                              Purchase
                                            </>
                                          ) : (
                                            <>
                                              <Coins className="h-3 w-3" />
                                              Need {item.price - userPoints} more
                                            </>
                                          )}
                                        </Button>
                                      </form>
                                    ) : (
                                      <Badge variant="secondary" className="gap-1">
                                        <Check className="h-3 w-3" />
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
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

// Helper function for Next.js revalidation
function revalidatePath(path: string) {
  // This would be handled by Next.js server actions
  // In a real implementation, you'd import from 'next/cache'
}
