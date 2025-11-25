"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, Plus, LogOut, User, Search, Check, X, Crown, Star, ExternalLink, Tag, Trash2, Users, Mail } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

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
    listingId?: string
    currentOwner?: string
    isAlias?: boolean
  } | null>(null)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [isSellModalOpen, setIsSellModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [selectedUsername, setSelectedUsername] = useState<{username: string, price: number, sellerContact?: string, listingId?: string, currentOwner?: string} | null>(null)
  const [userAliases, setUserAliases] = useState<string[]>([])
  const [myListings, setMyListings] = useState<any[]>([])
  const [sellForm, setSellForm] = useState({
    username: "",
    price: "",
    contactInfo: ""
  })
  const [transferForm, setTransferForm] = useState({
    username: "",
    newOwnerUsername: "",
    newOwnerId: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [removeListingDialog, setRemoveListingDialog] = useState<{open: boolean, listingId: string, username: string}>({open: false, listingId: "", username: ""})
  
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
        await fetchUserAliases(user.id)

        // Загружаем активные listings пользователя
        await fetchMyListings(user.id)
      }
    }
    fetchUser()
  }, [supabase])

  const fetchUserAliases = async (userId: string) => {
    const { data: aliases } = await supabase
      .from("user_aliases")
      .select("alias")
      .eq("user_id", userId)
    setUserAliases(aliases?.map(a => a.alias) || [])
  }

  const fetchMyListings = async (userId: string) => {
    const { data: listings } = await supabase
      .from("username_marketplace")
      .select("*")
      .eq("seller_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
    setMyListings(listings || [])
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
      const searchUsername = username.toLowerCase()

      // Сначала проверяем в списке зарезервированных
      const isReserved = RESERVED_USERNAMES.includes(searchUsername)
      
      if (isReserved) {
        setResult({
          available: false,
          length: username.length
        })
        setIsChecking(false)
        return
      }

      // Проверяем, продается ли username на маркетплейсе
      const { data: marketplaceData, error: marketplaceError } = await supabase
        .from("username_marketplace")
        .select("*, profiles(username)")
        .eq("username", searchUsername)
        .eq("status", "active")
        .single()

      if (!marketplaceError && marketplaceData) {
        setResult({
          available: true,
          price: marketplaceData.price,
          length: username.length,
          forSale: true,
          sellerContact: marketplaceData.contact_info,
          sellerPrice: marketplaceData.price,
          listingId: marketplaceData.id,
          currentOwner: marketplaceData.profiles?.username
        })
        setIsChecking(false)
        return
      }

      // Проверяем в таблице алиасов пользователей
      const { data: aliasData, error: aliasError } = await supabase
        .from("user_aliases")
        .select("*, profiles(username)")
        .eq("alias", searchUsername)
        .single()

      if (!aliasError && aliasData) {
        setResult({
          available: false,
          length: username.length,
          currentOwner: aliasData.profiles?.username,
          isAlias: true
        })
        setIsChecking(false)
        return
      }

      // Затем проверяем в базе данных профилей
      const { data: existingProfile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", searchUsername)
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
        sellerContact: result.sellerContact,
        listingId: result.listingId,
        currentOwner: result.currentOwner
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

  const handleTransferAlias = (alias: string) => {
    setTransferForm({
      username: alias,
      newOwnerUsername: "",
      newOwnerId: ""
    })
    setIsTransferModalOpen(true)
  }

  const searchUser = async () => {
    if (!transferForm.newOwnerUsername.trim()) return

    setIsSearchingUser(true)
    try {
      const searchUsername = transferForm.newOwnerUsername.toLowerCase()

      // Сначала ищем в основных профилях
      let profileData = null
      const { data: mainProfile, error: mainError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", searchUsername)
        .single()

      if (!mainError && mainProfile) {
        profileData = mainProfile
      } else {
        // Если не нашли в основных профилях, ищем в алиасах
        const { data: aliasData, error: aliasError } = await supabase
          .from("user_aliases")
          .select("profiles(id, username, display_name)")
          .eq("alias", searchUsername)
          .single()

        if (!aliasError && aliasData?.profiles) {
          profileData = aliasData.profiles
        }
      }

      if (!profileData) {
        toast.error("User not found", {
          description: "Please check the username and try again."
        })
        return
      }

      setTransferForm(prev => ({
        ...prev,
        newOwnerId: profileData.id
      }))

      toast.success("User found", {
        description: `Ready to transfer to @${profileData.username}`
      })
    } catch (error) {
      console.error("Error searching user:", error)
      toast.error("Search failed", {
        description: "Error searching for user. Please try again."
      })
    } finally {
      setIsSearchingUser(false)
    }
  }

  const handleSubmitSell = async () => {
    if (!sellForm.price || !sellForm.contactInfo) {
      toast.error("Missing information", {
        description: "Please fill in all fields"
      })
      return
    }

    if (!sellForm.contactInfo.includes('@')) {
      toast.error("Invalid contact info", {
        description: "Please provide a valid Telegram username starting with @"
      })
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
        if (error.code === '23505') {
          toast.error("Already listed", {
            description: "This username is already listed for sale"
          })
        } else if (error.code === '42501') {
          toast.error("Permission denied", {
            description: "Please make sure the marketplace table exists."
          })
        } else {
          throw error
        }
        return
      }

      toast.success("Listed for sale", {
        description: `@${sellForm.username} is now available on marketplace`
      })
      
      setIsSellModalOpen(false)
      setSellForm({ username: "", price: "", contactInfo: "" })
      await fetchMyListings(user.id)
      
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
      toast.error("Listing failed", {
        description: "Failed to list username for sale. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveListing = async (listingId: string, listingUsername: string) => {
    try {
      console.log("Removing listing:", { listingId, listingUsername, userId: user.id })
      
      const { error } = await supabase
        .from("username_marketplace")
        .update({ status: 'cancelled' })
        .eq('id', listingId)
        .eq('seller_id', user.id)

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      // После удаления листинга, username возвращается в My Aliases
      // Проверяем, что алиас действительно принадлежит пользователю
      const { data: existingAlias } = await supabase
        .from("user_aliases")
        .select("alias")
        .eq("alias", listingUsername.toLowerCase())
        .eq("user_id", user.id)
        .single()

      if (!existingAlias) {
        // Если алиас не существует, создаем его
        const { error: insertError } = await supabase
          .from("user_aliases")
          .insert({
            alias: listingUsername.toLowerCase(),
            user_id: user.id
          })

        if (insertError) {
          console.error("Error adding alias back:", insertError)
        }
      }

      toast.success("Listing removed", {
        description: `@${listingUsername} has been removed from marketplace and returned to your aliases`
      })

      await fetchMyListings(user.id)
      await fetchUserAliases(user.id)
      
      // Если удаленный listing был в текущем поиске, сбрасываем результат
      if (username === listingUsername) {
        setResult(null)
        setUsername("")
      }
      
      setRemoveListingDialog({open: false, listingId: "", username: ""})
    } catch (error) {
      console.error("Error removing listing:", error)
      toast.error("Remove failed", {
        description: "Failed to remove listing. Please try again."
      })
    }
  }

  const handleTransfer = async () => {
    if (!transferForm.newOwnerId) {
      toast.error("User not selected", {
        description: "Please search and select a user first"
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Сначала проверяем, что новый владелец существует
      const { data: newOwner, error: ownerError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", transferForm.newOwnerId)
        .single()

      if (ownerError || !newOwner) {
        toast.error("User not found", {
          description: "New owner not found"
        })
        return
      }

      // Проверяем, что пользователь не пытается передать алиас самому себе
      if (newOwner.id === user.id) {
        toast.error("Invalid transfer", {
          description: "You cannot transfer an alias to yourself"
        })
        return
      }

      // Удаляем алиас у текущего пользователя
      const { error: deleteError } = await supabase
        .from("user_aliases")
        .delete()
        .eq("alias", transferForm.username.toLowerCase())
        .eq("user_id", user.id)

      if (deleteError) {
        console.error("Error deleting alias from current owner:", deleteError)
        throw deleteError
      }

      // Добавляем алиас новому пользователю
      const { error: insertError } = await supabase
        .from("user_aliases")
        .insert({
          alias: transferForm.username.toLowerCase(),
          user_id: transferForm.newOwnerId
        })

      if (insertError) {
        console.error("Error adding alias to new owner:", insertError)
        
        // Если не удалось добавить новому владельцу, возвращаем алиас старому
        await supabase
          .from("user_aliases")
          .insert({
            alias: transferForm.username.toLowerCase(),
            user_id: user.id
          })
        
        throw insertError
      }

      // Если username был в продаже, удаляем listing
      const existingListing = myListings.find(l => l.username === transferForm.username)
      if (existingListing) {
        await supabase
          .from("username_marketplace")
          .update({ status: 'cancelled' })
          .eq('username', transferForm.username.toLowerCase())
          .eq('seller_id', user.id)
      }

      toast.success("Transfer completed", {
        description: `@${transferForm.username} successfully transferred to @${newOwner.username}`
      })
      
      setIsTransferModalOpen(false)
      setTransferForm({ username: "", newOwnerUsername: "", newOwnerId: "" })
      
      // Обновляем данные
      await fetchUserAliases(user.id)
      await fetchMyListings(user.id)

    } catch (error) {
      console.error("Error transferring username:", error)
      toast.error("Transfer failed", {
        description: "Failed to transfer username. Please try again."
      })
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
              Buy, sell, and transfer exclusive usernames
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
                          {result.forSale 
                            ? "For sale!" 
                            : result.isAlias 
                              ? `Alias owned by @${result.currentOwner}`
                              : result.available 
                                ? "Available for purchase!" 
                                : "Already taken"
                          }
                        </p>
                        {result.currentOwner && !result.forSale && (
                          <p className="text-xs text-muted-foreground">
                            Current owner: @{result.currentOwner}
                          </p>
                        )}
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

          {/* My Listings Section */}
          {user && myListings.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">My Active Listings</h3>
              <div className="grid gap-3">
                {myListings.map((listing) => (
                  <Card key={listing.id} className="border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-orange-600" />
                          <div>
                            <h4 className="font-semibold">@{listing.username}</h4>
                            <p className="text-sm text-muted-foreground">
                              {listing.price} stars • {listing.contact_info}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setRemoveListingDialog({
                              open: true, 
                              listingId: listing.id, 
                              username: listing.username
                            })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sell Your Aliases Section */}
          {user && userAliases.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">My Aliases</h3>
              <div className="grid gap-3">
                {userAliases.map((alias) => (
                  <Card key={alias} className="border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-semibold">@{alias}</h4>
                            <p className="text-sm text-muted-foreground">
                              Your alias • Suggested price: {calculatePrice(alias.length)} stars
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSellAlias(alias)}
                          >
                            Sell
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleTransferAlias(alias)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
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
              {result?.currentOwner && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">Current Owner:</span>
                  <span className="text-sm">@{result.currentOwner}</span>
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

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Transfer @{transferForm.username}
            </DialogTitle>
            <DialogDescription>
              Transfer this alias to another user
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Transferring:</span>
                <span>@{transferForm.username}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newOwner">New Owner Username</Label>
              <div className="flex gap-2">
                <Input
                  id="newOwner"
                  placeholder="Enter username (without @)"
                  value={transferForm.newOwnerUsername}
                  onChange={(e) => setTransferForm({...transferForm, newOwnerUsername: e.target.value})}
                />
                <Button 
                  onClick={searchUser} 
                  disabled={isSearchingUser || !transferForm.newOwnerUsername.trim()}
                  size="sm"
                >
                  {isSearchingUser ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the username of the user you want to transfer this alias to
              </p>
            </div>

            {transferForm.newOwnerId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✓ User found: @{transferForm.newOwnerUsername}
                </p>
              </div>
            )}

            <Button 
              onClick={handleTransfer} 
              className="w-full" 
              disabled={!transferForm.newOwnerId || isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? "Transferring..." : "Confirm Transfer"}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              <p className="text-red-600 font-medium">Warning: This action cannot be undone!</p>
              <p>The alias will be permanently transferred to the new owner.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Listing Confirmation Dialog */}
      <AlertDialog open={removeListingDialog.open} onOpenChange={(open) => setRemoveListingDialog({...removeListingDialog, open})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Listing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove @{removeListingDialog.username} from the marketplace?
              This username will be returned to your aliases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRemoveListing(removeListingDialog.listingId, removeListingDialog.username)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Listing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
