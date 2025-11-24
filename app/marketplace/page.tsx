"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, Plus, LogOut, User, Search, Check, X, Crown, Star, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Список занятых username, которые не нужно проверять в базе
const RESERVED_USERNAMES = [
  "azya", "maxnklv", "maxnikolaev", "nklv", "zima", "vlkv", "bolt", "admin", "problems"
]

export default function MarketplacePage() {
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<{
    available: boolean
    price?: number
    length: number
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUsername, setSelectedUsername] = useState<{username: string, price: number} | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, display_name, username")
          .eq("id", user.id)
          .single()
        setUserProfile(profile)
      }
    }
    fetchUser()
  }, [supabase])

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const calculatePrice = (length: number): number => {
    if (length === 1) return 2000
    if (length === 2) return 1750
    if (length === 3) return 1500
    if (length === 4) return 1250
    if (length === 5) return 1000
    if (length === 6) return 600
    if (length === 7) return 400
    if (length === 8) return 200
    return 100
  }

  const checkUsername = async () => {
    if (!username.trim()) return

    setIsChecking(true)
    
    try {
      // Сначала проверяем в списке зарезервированных
      const isReserved = RESERVED_USERNAMES.includes(username.toLowerCase())
      
      if (isReserved) {
        setResult({
          available: false,
          length: username.length
        })
        setIsChecking(false)
        return
      }

      // Затем проверяем в базе данных
      const { data: existingProfile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username.toLowerCase())
        .single()

      // Если есть ошибка и это не "не найдено", значит реальная ошибка
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking username:", error)
        setResult({
          available: false,
          length: username.length
        })
        return
      }

      // Если профиль найден - username занят
      const isAvailable = !existingProfile

      setResult({
        available: isAvailable,
        price: isAvailable ? calculatePrice(username.length) : undefined,
        length: username.length
      })
    } catch (error) {
      console.error("Error checking username:", error)
      setResult({
        available: false,
        length: username.length
      })
    } finally {
      setIsChecking(false)
    }
  }

  const handlePurchase = () => {
    setIsModalOpen(true)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const topUsernames = {
    "1 Letter": ["x", "q", "z", "v", "k"],
    "2 Letters": ["ai", "io", "me", "tv", "ex", "vc", "gg", "cc", "yy", "zz"],
  }

  const priceMap = {
    1: 2000,
    2: 1750,
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

      {/* Hero Section */}
      <section className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex justify-center mb-4">
              <Crown className="h-12 w-12 text-yellow-500" />
            </div>
            <h1 className="mb-4 text-4xl font-bold text-foreground">
              Premium Username Marketplace
            </h1>
            <p className="mb-6 text-xl text-muted-foreground">
              Get exclusive usernames with Telegram Stars
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Powered by Telegram Stars</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Username Search Section */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Find Your Perfect Username
              </h2>
              <p className="text-muted-foreground text-lg">
                Search for any username and check its availability and price
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  onKeyPress={(e) => e.key === 'Enter' && checkUsername()}
                  className="flex-1 text-lg h-12"
                />
                <Button 
                  onClick={checkUsername} 
                  disabled={isChecking || !username.trim()}
                  className="h-12 px-6"
                >
                  {isChecking ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Check
                </Button>
              </div>

              {result && (
                <Card className={result.available ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${result.available ? 'bg-green-100' : 'bg-red-100'}`}>
                          {result.available ? (
                            <Check className="h-6 w-6 text-green-600" />
                          ) : (
                            <X className="h-6 w-6 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            @{username}
                          </h3>
                          <p className={result.available ? "text-green-600" : "text-red-600"}>
                            {result.available ? "Available for purchase!" : "Already taken"}
                          </p>
                        </div>
                      </div>
                      
                      {result.available && result.price && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
                            <Star className="h-6 w-6 text-yellow-500" />
                            {result.price}
                          </div>
                          <p className="text-sm text-muted-foreground">{result.length} letters</p>
                          <Button onClick={handlePurchase} className="mt-2">
                            Purchase
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* Top Usernames Section */}
          <section>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Premium Usernames
              </h2>
              <p className="text-muted-foreground text-lg">
                Exclusive short usernames available for purchase
              </p>
            </div>
            
            <div className="space-y-8">
              {Object.entries(topUsernames).map(([category, usernames]) => (
                <div key={category}>
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {category} Usernames
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {usernames.map((username) => {
                      const price = priceMap[username.length as keyof typeof priceMap]
                      return (
                        <Card 
                          key={username} 
                          className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200"
                          onClick={() => setSelectedUsername({ username, price })}
                        >
                          <CardContent className="p-4 text-center">
                            <div className="font-mono font-bold text-lg mb-2">@{username}</div>
                            <div className="flex items-center justify-center gap-1 text-yellow-600">
                              <Star className="h-4 w-4" />
                              <span className="font-semibold">{price}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pricing Info Section */}
          <section className="bg-muted/50 rounded-lg p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Pricing Structure
              </h3>
              <p className="text-muted-foreground">
                All prices are in Telegram Stars
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {[
                { length: "1 letter", price: "2000", stars: "⭐⭐⭐⭐⭐" },
                { length: "2 letters", price: "1750", stars: "⭐⭐⭐⭐" },
                { length: "3 letters", price: "1500", stars: "⭐⭐⭐" },
                { length: "4 letters", price: "1250", stars: "⭐⭐⭐" },
                { length: "5 letters", price: "1000", stars: "⭐⭐" },
                { length: "6 letters", price: "600", stars: "⭐⭐" },
                { length: "7 letters", price: "400", stars: "⭐" },
                { length: "8 letters", price: "200", stars: "⭐" },
                { length: "9+ letters", price: "100", stars: "⭐" },
              ].map((item, index) => (
                <div key={index} className="text-center p-4 bg-background rounded-lg border">
                  <div className="text-2xl font-bold text-foreground mb-2">{item.length}</div>
                  <div className="text-lg font-semibold text-primary mb-1">{item.price} stars</div>
                  <div className="text-yellow-500 text-sm">{item.stars}</div>
                </div>
              ))}
            </div>
          </section>

          {/* How It Works Section */}
          <section className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-8">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">1</div>
                <h4 className="font-semibold text-foreground">Search Username</h4>
                <p className="text-muted-foreground text-sm">
                  Check if your desired username is available
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">2</div>
                <h4 className="font-semibold text-foreground">See Price</h4>
                <p className="text-muted-foreground text-sm">
                  Get the price in Telegram Stars based on username length
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-lg font-bold">3</div>
                <h4 className="font-semibold text-foreground">Contact CEO</h4>
                <p className="text-muted-foreground text-sm">
                  Message our CEO on Telegram to complete purchase
                </p>
              </div>
            </div>
          </section>
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

      {/* Purchase Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Purchase @{username}
            </DialogTitle>
            <DialogDescription>
              Contact our CEO to complete your username purchase
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Username:</span>
                <span>@{username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Price:</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {result?.price} Telegram Stars
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Message our CEO on Telegram to complete the purchase:
              </p>
              <Button asChild className="w-full gap-2">
                <a href="https://t.me/maxnklv" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Contact @maxnklv on Telegram
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Username Purchase Modal */}
      <Dialog open={!!selectedUsername} onOpenChange={() => setSelectedUsername(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Purchase @{selectedUsername?.username}
            </DialogTitle>
            <DialogDescription>
              Contact our CEO to complete your username purchase
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Username:</span>
                <span>@{selectedUsername?.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Price:</span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {selectedUsername?.price} Telegram Stars
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Message our CEO on Telegram to complete the purchase:
              </p>
              <Button asChild className="w-full gap-2">
                <a href="https://t.me/maxnklv" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Contact @maxnklv on Telegram
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
