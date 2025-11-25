"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, Plus, LogOut, User, Search, Check, X, Crown, Star, ExternalLink, Tag } from "lucide-react"
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
import { Label } from "@/components/ui/label"

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
    forSale?: boolean
    sellerContact?: string
    sellerPrice?: number
  } | null>(null)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [selectedUsername, setSelectedUsername] = useState<{username: string, price: number, sellerContact?: string} | null>(null)
  const [userAliases, setUserAliases] = useState<string[]>([])
  const [sellForm, setSellForm] = useState({
    username: "",
    price: "",
    contactInfo: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
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

        // Загружаем алиасы пользователя
        const { data: aliases } = await supabase
          .from("user_aliases")
          .select("alias")
          .eq("user_id", user.id)
        setUserAliases(aliases?.map(a => a.alias) || [])
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

      // Проверяем, продается ли username
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from("username_marketplace")
        .select("*")
        .eq("username", username.toLowerCase())
        .eq("status", "active")
        .single()

      if (!marketplaceError && marketplaceData) {
        setResult({
          available: true,
          price: marketplaceData.price,
          length: username.length,
          forSale: true,
          sellerContact: marketplaceData.contact_info,
          sellerPrice: marketplaceData.price
        })
        setIsChecking(false)
        return
      }

      // Затем проверяем в базе данных профилей
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
        length: username.length,
        forSale: false
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
    if (result?.forSale) {
      setSelectedUsername({
        username,
        price: result.sellerPrice!,
        sellerContact: result.sellerContact
      })
    } else {
      setSelectedUsername({
        username,
        price: result?.price || calculatePrice(username.length)
      })
    }
    setIsPurchaseModalOpen(true)
  }

  const handleSellAlias = (alias: string) => {
    setSellForm({
      username: alias,
      price: calculatePrice(alias.length).toString(),
      contactInfo: userProfile?.username ? `@${userProfile.username}` : ""
    })
    setIsSellModalOpen(true)
  }

  const handleSubmitSell = async () => {
    if (!sellForm.price || !sellForm.contactInfo) {
      alert("Please fill in all fields")
      return
    }

    if (!sellForm.contactInfo.includes('@')) {
      alert("Please provide a valid Telegram username starting with @")
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from("username_marketplace")
        .insert({
          username: sellForm.username.toLowerCase(),
          price: parseInt(sellForm.price),
          contact_info: sellForm.contactInfo,
          seller_id: user.id,
          status: "active"
        })

      if (error) {
        console.error("Supabase error:", error)
        if (error.code === '23505') { // unique violation
          alert("This username is already listed for sale")
        } else if (error.code === '42501') { // permission denied
          alert("Permission denied. Please make sure the marketplace table exists.")
        } else {
          throw error
        }
        return
      }

      alert("Username listed for sale successfully!")
      setIsSellModalOpen(false)
      setSellForm({ username: "", price: "", contactInfo: "" })
      
      // Обновляем результат поиска
      if (username === sellForm.username) {
        setResult({
          available: true,
          price: parseInt(sellForm.price),
          length: sellForm.username.length,
          forSale: true,
          sellerContact: sellForm.contactInfo,
          sellerPrice: parseInt(sellForm.price)
        })
      }
    } catch (error) {
      console.error("Error listing username:", error)
      alert("Failed to list username for sale. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
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
            
            <div className="flex items-center gap-4">
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <Crown className="h-12 w-12 text-yellow-500 mx-auto" />
            <h1 className="text-3xl font-bold text-foreground">
              Username Marketplace
            </h1>
            <p className="text-muted-foreground">
              Buy and sell exclusive usernames with Telegram Stars
            </p>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search username..."
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onKeyPress={(e) => e.key === 'Enter' && checkUsername()}
                className="flex-1"
              />
              <Button 
                onClick={checkUsername} 
                disabled={isChecking || !username.trim()}
              >
                {isChecking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {result && (
              <Card className={result.available ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${result.available ? 'bg-green-100' : 'bg-red-100'}`}>
                        {result.available ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          @{username}
                        </h3>
                        <p className={result.available ? "text-green-600" : "text-red-600"}>
                          {result.forSale ? "For sale!" : result.available ? "Available for purchase!" : "Already taken"}
                        </p>
                      </div>
                    </div>
                    
                    {result.available && result.price && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-bold text-foreground">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {result.price}
                        </div>
                        <Button onClick={handlePurchase} size="sm" className="mt-1">
                          {result.forSale ? "Purchase" : "Contact to Buy"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sell Your Aliases Section */}
          {user && userAliases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Sell Your Aliases</h3>
              <div className="grid gap-3">
                {userAliases.map((alias) => (
                  <Card key={alias} className="border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-semibold">@{alias}</h4>
                            <p className="text-sm text-muted-foreground">Your alias • Suggested price: {calculatePrice(alias.length)} stars</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSellAlias(alias)}
                        >
                          Sell
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-3">Pricing Guide</h3>
              <div className="space-y-2 text-sm">
                {[
                  { length: "1-2 letters", price: "2000-1750 stars" },
                  { length: "3-4 letters", price: "1500-1250 stars" },
                  { length: "5-6 letters", price: "1000-600 stars" },
                  { length: "7+ letters", price: "400-100 stars" },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">{item.length}</span>
                    <span className="font-medium">{item.price}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>StartOrigin is not responsible for second-hand username sales.</p>
            <p>All transactions are between buyers and sellers directly.</p>
          </div>
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
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              {result?.forSale ? "Purchase @" + username : "Contact to Buy @" + username}
            </DialogTitle>
            <DialogDescription>
              {result?.forSale 
                ? "Contact the seller to complete your purchase"
                : "Contact our team to purchase this username"
              }
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
              {result?.forSale && result.sellerContact && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">Seller Contact:</span>
                  <span className="text-sm">{result.sellerContact}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {result?.forSale 
                  ? "Contact the seller directly to arrange the transfer:"
                  : "Message @maxnklv on Telegram to purchase this username:"
                }
              </p>
              <Button asChild className="w-full gap-2">
                <a 
                  href={result?.forSale && result.sellerContact?.includes('@') 
                    ? `https://t.me/${result.sellerContact.replace('@', '')}`
                    : "https://t.me/maxnklv"
                  } 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  {result?.forSale 
                    ? `Contact ${result.sellerContact}`
                    : "Contact @maxnklv on Telegram"
                  }
                </a>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              <p>StartOrigin is not responsible for second-hand transactions.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell Modal */}
      <Dialog open={isSellModalOpen} onOpenChange={setIsSellModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              Sell @{sellForm.username}
            </DialogTitle>
            <DialogDescription>
              List your alias for sale on the marketplace
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (Telegram Stars)</Label>
              <Input
                id="price"
                type="number"
                placeholder="Enter price in stars"
                value={sellForm.price}
                onChange={(e) => setSellForm({...sellForm, price: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Suggested price: {calculatePrice(sellForm.username.length)} stars
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Telegram Username</Label>
              <Input
                id="contact"
                placeholder="@yourusername"
                value={sellForm.contactInfo}
                onChange={(e) => setSellForm({...sellForm, contactInfo: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Buyers will contact you here. Must start with @
              </p>
            </div>

            <Button 
              onClick={handleSubmitSell} 
              className="w-full" 
              disabled={!sellForm.price || !sellForm.contactInfo || !sellForm.contactInfo.includes('@') || isSubmitting}
            >
              {isSubmitting ? "Listing..." : "List for Sale"}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              <p>By listing, you agree to transfer the alias to the buyer upon payment.</p>
              <p>StartOrigin is not responsible for transactions.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
