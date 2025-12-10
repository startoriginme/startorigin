"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Lightbulb, Plus, LogOut, User, Search, Check, X, Crown, Star, ExternalLink, Tag, Trash2, Menu, Filter, ChevronDown, ChevronUp, Hash } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

// List of reserved usernames that don't need database checking
const RESERVED_USERNAMES = [
  "azya", "maxnklv", "maxnikolaev", "nklv", "zima", "vlkv", "bolt", "admin", "problems"
]

// Recommended usernames for quick search
const RECOMMENDED_USERNAMES = [
  { username: "ai", price: 1000, length: 2, description: "Ultra rare 2-letter" },
  { username: "web", price: 800, length: 3, description: "Popular 3-letter" },
  { username: "dev", price: 800, length: 3, description: "Tech 3-letter" }
]

// Function to calculate price based on new system
const calculatePrice = (length: number): number => {
  if (length === 1) return 1000
  if (length === 2) return 950 // average 900-1000
  if (length === 3) return 800 // average 700-900
  if (length === 4) return 550 // average 400-700
  if (length === 5) return 550 // average 400-700
  if (length === 6) return 275 // average 150-400
  if (length === 7) return 275 // average 150-400
  if (length === 8) return 125 // average 100-150
  if (length === 9) return 125 // average 100-150
  return 100
}

// Function to get price category
const getPriceCategory = (price: number): string => {
  if (price >= 700) return "1000-700 stars"
  if (price >= 400) return "400-700 stars"
  if (price >= 100) return "100-400 stars"
  return "Under 100 stars"
}

// Sorting and filtering types
type SortOption = "expensive-first" | "cheap-first" | "length-down" | "length-up"

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
  const [selectedUsername, setSelectedUsername] = useState<{username: string, price: number, sellerContact?: string, listingId?: string, currentOwner?: string} | null>(null)
  const [userAliases, setUserAliases] = useState<string[]>([])
  const [allListings, setAllListings] = useState<any[]>([])
  const [sortOption, setSortOption] = useState<SortOption>("expensive-first")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [lengthFilter, setLengthFilter] = useState<string>("all")
  
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

        // Load user aliases
        await fetchUserAliases(user.id)
      }
    }
    fetchUser()
    
    // Load all marketplace listings
    fetchAllListings()
  }, [supabase])

  const fetchUserAliases = async (userId: string) => {
    const { data: aliases } = await supabase
      .from("user_aliases")
      .select("alias")
      .eq("user_id", userId)
    setUserAliases(aliases?.map(a => a.alias) || [])
  }

  const fetchAllListings = async () => {
    const { data: listings, error } = await supabase
      .from("username_marketplace")
      .select("*, profiles(username, display_name)")
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (!error && listings) {
      setAllListings(listings)
    }
  }

  // Filtered and sorted listings
  const filteredListings = useMemo(() => {
    let filtered = [...allListings]

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter(listing => {
        const price = listing.price
        if (priceFilter === "1000-700") return price >= 700
        if (priceFilter === "400-700") return price >= 400 && price < 700
        if (priceFilter === "100-400") return price >= 100 && price < 400
        if (priceFilter === "under-100") return price < 100
        return true
      })
    }

    // Length filter
    if (lengthFilter !== "all") {
      filtered = filtered.filter(listing => {
        const length = listing.username.length
        if (lengthFilter === "1-2") return length <= 2
        if (lengthFilter === "3-4") return length >= 3 && length <= 4
        if (lengthFilter === "5-7") return length >= 5 && length <= 7
        if (lengthFilter === "8+") return length >= 8
        return true
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      const aLength = a.username.length
      const bLength = b.username.length
      const aPrice = a.price
      const bPrice = b.price

      switch (sortOption) {
        case "expensive-first":
          return bPrice - aPrice
        case "cheap-first":
          return aPrice - bPrice
        case "length-down":
          return aLength - bLength
        case "length-up":
          return bLength - aLength
        default:
          return 0
      }
    })

    return filtered
  }, [allListings, sortOption, priceFilter, lengthFilter])

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const checkUsername = async () => {
    if (!username.trim()) return

    setIsChecking(true)
    
    try {
      const searchUsername = username.toLowerCase()

      // First check reserved list
      const isReserved = RESERVED_USERNAMES.includes(searchUsername)
      
      if (isReserved) {
        setResult({
          available: false,
          length: username.length
        })
        setIsChecking(false)
        return
      }

      // Check if username is for sale on marketplace
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

      // Check user aliases table
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

      // Check profiles database
      const { data: existingProfile, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", searchUsername)
        .single()

      // If error and it's not "not found", it's a real error
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking username:", error)
        setResult({
          available: false,
          length: username.length
        })
        return
      }

      // If profile found - username is taken
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

  const handlePurchase = (listing: any) => {
    setSelectedUsername({
      username: listing.username,
      price: listing.price,
      sellerContact: listing.contact_info,
      listingId: listing.id,
      currentOwner: listing.profiles?.username
    })
    setIsPurchaseModalOpen(true)
  }

  const handleRemoveAlias = async (alias: string) => {
    try {
      const { error } = await supabase
        .from("user_aliases")
        .delete()
        .eq("alias", alias.toLowerCase())
        .eq("user_id", user.id)

      if (error) throw error

      toast.success("Alias removed", {
        description: `@${alias} has been removed from your aliases`
      })
      
      await fetchUserAliases(user.id)
    } catch (error) {
      console.error("Error removing alias:", error)
      toast.error("Remove failed", {
        description: "Failed to remove alias. Please try again."
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleRecommendedSearch = (recommended: { username: string, price: number, length: number, description: string }) => {
    setUsername(recommended.username)
    // Set filters based on recommendation
    if (recommended.length <= 2) {
      setPriceFilter("1000-700")
      setLengthFilter("1-2")
    } else if (recommended.length === 3) {
      setPriceFilter("400-700")
      setLengthFilter("3-4")
    }
  }

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
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-3 sm:space-y-4">
            <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Username Marketplace
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Buy exclusive usernames up to 1000 stars
            </p>
          </div>

          {/* Recommended Usernames */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Recommended Usernames</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {RECOMMENDED_USERNAMES.map((rec, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20">
                  <CardContent className="p-4" onClick={() => handleRecommendedSearch(rec)}>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xl font-bold">
                          @{rec.username}
                        </div>
                        <div className="flex items-center gap-1 text-lg font-bold">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {rec.price}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <Button size="sm" className="w-full">
                        <Search className="h-3 w-3 mr-2" />
                        View similar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search username..."
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                onKeyPress={(e) => e.key === 'Enter' && checkUsername()}
                className="flex-1 text-sm sm:text-base"
              />
              <Button 
                onClick={checkUsername} 
                disabled={isChecking || !username.trim()}
                size="sm"
                className="sm:px-4"
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
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`p-1.5 sm:p-2 rounded-full ${result.available ? 'bg-green-100' : 'bg-red-100'}`}>
                        {result.available ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                          @{username}
                        </h3>
                        <p className={`text-xs sm:text-sm ${result.available ? "text-green-600" : "text-red-600"}`}>
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
                          <p className="text-xs text-muted-foreground truncate">
                            Current owner: @{result.currentOwner}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {result.available && result.price && (
                      <div className="text-right pl-2">
                        <div className="flex items-center gap-1 text-base sm:text-lg font-bold text-foreground">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                          {result.price}
                        </div>
                        <Button onClick={() => {
                          setSelectedUsername({
                            username,
                            price: result.price!,
                            sellerContact: result.sellerContact || "@w1nter_dev"
                          })
                          setIsPurchaseModalOpen(true)
                        }} size="sm" className="mt-1 text-xs">
                          {result.forSale ? "Purchase" : "Contact to Buy"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Filters Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Sort by</Label>
              <Select value={sortOption} onValueChange={(value: SortOption) => setSortOption(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expensive-first">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      Expensive first
                    </div>
                  </SelectItem>
                  <SelectItem value="cheap-first">
                    <div className="flex items-center gap-2">
                      <ChevronUp className="h-4 w-4" />
                      Cheap first
                    </div>
                  </SelectItem>
                  <SelectItem value="length-down">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Short usernames first
                    </div>
                  </SelectItem>
                  <SelectItem value="length-up">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Long usernames first
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Price range</Label>
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All prices</SelectItem>
                  <SelectItem value="1000-700">1000-700 stars</SelectItem>
                  <SelectItem value="400-700">400-700 stars</SelectItem>
                  <SelectItem value="100-400">100-400 stars</SelectItem>
                  <SelectItem value="under-100">Under 100 stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Username length</Label>
              <Select value={lengthFilter} onValueChange={setLengthFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All lengths" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lengths</SelectItem>
                  <SelectItem value="1-2">1-2 characters</SelectItem>
                  <SelectItem value="3-4">3-4 characters</SelectItem>
                  <SelectItem value="5-7">5-7 characters</SelectItem>
                  <SelectItem value="8+">8+ characters</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { range: "1000-700 stars", desc: "1-2 characters", color: "bg-gradient-to-r from-yellow-500 to-orange-500" },
              { range: "400-700 stars", desc: "3-5 characters", color: "bg-gradient-to-r from-orange-400 to-pink-500" },
              { range: "100-400 stars", desc: "6-7 characters", color: "bg-gradient-to-r from-pink-400 to-purple-500" },
              { range: "100-150 stars", desc: "8-9 characters", color: "bg-gradient-to-r from-purple-400 to-blue-500" },
            ].map((category, index) => (
              <Card key={index} className="overflow-hidden border-0">
                <div className={`h-2 ${category.color}`} />
                <CardContent className="p-3">
                  <div className="text-center">
                    <p className="font-bold text-sm">{category.range}</p>
                    <p className="text-xs text-muted-foreground">{category.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* All Listings */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Available Usernames</h3>
              <Badge variant="outline" className="text-xs">
                {filteredListings.length} usernames
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4" onClick={() => handlePurchase(listing)}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-lg font-bold">
                              @{listing.username}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {listing.username.length} chars
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Owner: @{listing.profiles?.username || "unknown"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xl font-bold">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {listing.price}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getPriceCategory(listing.price)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Profile Preview */}
                      <div className="bg-muted rounded-lg p-3 border">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold">@{listing.username.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">@{listing.username}</p>
                            <p className="text-xs text-muted-foreground">on StartOrigin</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button className="w-full" size="sm">
                        <Star className="h-4 w-4 mr-2" />
                        Buy for {listing.price} stars
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredListings.length === 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-foreground">No usernames found</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Try changing your filters or search for a specific username
                </p>
              </div>
            )}
          </div>

          {/* My Aliases Section (only removal) */}
          {user && userAliases.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg font-semibold text-foreground">My Aliases</h3>
              <div className="grid gap-2 sm:gap-3">
                {userAliases.map((alias) => (
                  <Card key={alias} className="border-blue-200">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm sm:text-base truncate">@{alias}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Your alias • Price: {calculatePrice(alias.length)} stars
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove @${alias} from your aliases?`)) {
                                handleRemoveAlias(alias)
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-center text-xs text-muted-foreground border-t pt-3 sm:pt-4">
            <p>⚠️ StartOrigin is not responsible for second-hand username sales.</p>
            <p>All transactions are between buyers and sellers directly.</p>
            <p className="mt-2 text-amber-600 font-medium">
              🚀 Coming soon: Automated username transfers!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground text-xs sm:text-sm">
            © 2025 StartOrigin. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Purchase @{selectedUsername?.username}
            </DialogTitle>
            <DialogDescription>
              Contact to complete your purchase
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Username:</span>
                <span className="font-mono font-bold">@{selectedUsername?.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Price:</span>
                <span className="flex items-center gap-1 font-bold">
                  <Star className="h-4 w-4 text-yellow-500" />
                  {selectedUsername?.price} Telegram Stars
                </span>
              </div>
              {selectedUsername?.currentOwner && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-semibold">Current Owner:</span>
                  <span className="text-sm">@{selectedUsername.currentOwner}</span>
                </div>
              )}
            </div>

            {/* Profile Preview */}
            <div className="space-y-2">
              <Label>How it will look on profile:</Label>
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">@{selectedUsername?.username?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-lg">@{selectedUsername?.username}</p>
                    <p className="text-sm text-muted-foreground">StartOrigin member</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact for purchase:</Label>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800">
                  Contact: @w1nter_dev on Telegram
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Ask about details and availability. All unsold usernames can be purchased from @w1nter_dev.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Contact the seller to arrange the transfer:
              </p>
              <Button asChild className="w-full gap-2">
                <a 
                  href="https://t.me/w1nter_dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Contact @w1nter_dev on Telegram
                </a>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>StartOrigin is not responsible for second-hand transactions.</p>
              <p className="text-amber-600 font-medium">
                🚀 Automated transfers coming soon!
              </p>
              <p className="text-blue-600 font-medium mt-2">
                💬 Ask @w1nter_dev for details about any username!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
