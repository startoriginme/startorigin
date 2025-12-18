"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Paintbrush, Crown, Star, Zap, Gem, Check, Coins, Sparkles, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type CustomizationItem = {
  id: string
  name: string
  description: string
  type: string
  value: string
  icon: string | null
  price: number
  rarity: string
}

type UserCustomization = {
  id: string
  item_id: string
  is_active: boolean
  purchased_at: string
  customization_items: CustomizationItem
}

interface CustomizationModalProps {
  userId: string
  currentPoints: number
  activeCustomizations: UserCustomization[]
}

export default function CustomizationModal({ 
  userId, 
  currentPoints,
  activeCustomizations 
}: CustomizationModalProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CustomizationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      loadShopItems()
    }
  }, [open])

  const loadShopItems = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("customization_items")
        .select("*")
        .order("price")

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error("Error loading shop items:", error)
      toast({
        title: "Error",
        description: "Failed to load shop items",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const purchaseItem = async (itemId: string) => {
    setPurchasingId(itemId)
    try {
      const supabase = createClient()

      // 1. Get item info
      const { data: item } = await supabase
        .from("customization_items")
        .select("*")
        .eq("id", itemId)
        .single()

      if (!item) throw new Error("Item not found")

      // 2. Check if already owned
      const isOwned = activeCustomizations.some(c => c.item_id === itemId)
      if (isOwned) {
        toast({
          title: "Already Owned",
          description: "You already own this item",
        })
        return
      }

      // 3. Check points
      if (currentPoints < item.price) {
        const moreProblemsNeeded = Math.ceil((item.price - currentPoints) / 10)
        toast({
          title: "Not Enough Points",
          description: `You need ${item.price - currentPoints} more points (${moreProblemsNeeded} more problems)`,
          variant: "destructive",
        })
        return
      }

      // 4. Calculate new points
      const newPoints = currentPoints - item.price

      // 5. Start transaction
      // First, get current problems count to recalculate points later
      const { data: problems } = await supabase
        .from("problems")
        .select("id")
        .eq("author_id", userId)

      // 6. Create customization record
      const { error: purchaseError } = await supabase
        .from("user_customizations")
        .insert({
          user_id: userId,
          item_id: itemId,
          is_active: true,
          purchased_at: new Date().toISOString()
        })

      if (purchaseError) throw purchaseError

      // 7. Record transaction
      const { error: transactionError } = await supabase
        .from("point_transactions")
        .insert({
          user_id: userId,
          points: -item.price,
          type: "spent",
          description: `Purchased: ${item.name}`,
          created_at: new Date().toISOString()
        })

      if (transactionError) throw transactionError

      toast({
        title: "Success!",
        description: `Purchased ${item.name} for ${item.price} points`,
      })

      // 8. Close modal and refresh
      setOpen(false)
      router.refresh() // Refresh server components
      
      // Force reload to show updated points and customizations
      setTimeout(() => {
        window.location.reload()
      }, 500)
      
    } catch (error: any) {
      console.error("Error purchasing item:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to purchase item",
        variant: "destructive",
      })
    } finally {
      setPurchasingId(null)
    }
  }

  const getIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'crown': return <Crown className="h-5 w-5" />
      case 'star': return <Star className="h-5 w-5" />
      case 'zap': return <Zap className="h-5 w-5" />
      case 'gem': return <Gem className="h-5 w-5" />
      default: return <Sparkles className="h-5 w-5" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return "from-yellow-500 to-amber-600"
      case 'epic': return "from-purple-500 to-pink-500"
      case 'rare': return "from-blue-500 to-cyan-500"
      default: return "from-gray-500 to-gray-700"
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Paintbrush className="h-4 w-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Customization Shop
          </DialogTitle>
          <DialogDescription>
            Spend your points to customize your profile. Points = Problems × 10
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Points Display */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              <div>
                <span className="font-semibold text-amber-900">Your Points:</span>
                <p className="text-xs text-amber-600">Problems × 10</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-700">{currentPoints}</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                points
              </Badge>
            </div>
          </div>

          {/* Points Explanation */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">How Points Work</span>
            </div>
            <p className="text-sm text-blue-700">
              You get <span className="font-bold">10 points for each problem</span> you publish.
              <br />
              <span className="text-xs">Current points: {currentPoints} = {currentPoints / 10} problems × 10</span>
            </p>
          </div>

          {/* Active Customizations */}
          {activeCustomizations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Active Customizations</h3>
              <div className="space-y-2">
                {activeCustomizations.map((custom) => (
                  <div key={custom.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`bg-gradient-to-r ${getRarityColor(custom.customization_items?.rarity)} p-2 rounded-lg`}>
                        <div className="text-white">
                          {getIcon(custom.customization_items?.icon)}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{custom.customization_items?.name}</div>
                        <div className="text-xs text-muted-foreground">{custom.customization_items?.description}</div>
                        <div className="text-xs text-muted-foreground">
                          Type: {custom.customization_items?.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shop Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Available Items</h3>
              {loading && (
                <div className="text-xs text-muted-foreground">Loading...</div>
              )}
            </div>
            
            {items.length === 0 && !loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Paintbrush className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((item) => {
                  const isOwned = activeCustomizations.some(c => c.item_id === item.id)
                  const canAfford = currentPoints >= item.price
                  const moreProblemsNeeded = Math.ceil((item.price - currentPoints) / 10)
                  
                  return (
                    <div key={item.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {/* Item Header */}
                      <div className={`p-3 bg-gradient-to-r ${getRarityColor(item.rarity)} text-white`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getIcon(item.icon)}
                            <span className="font-semibold">{item.name}</span>
                          </div>
                          <Badge variant="secondary" className="bg-white/20 text-white border-0">
                            {item.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/90 mt-1">{item.description}</p>
                        <div className="text-xs text-white/70 mt-1">
                          Type: {item.type.replace('_', ' ')}
                        </div>
                      </div>

                      {/* Item Body */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-amber-600" />
                            <span className={`font-bold ${canAfford ? 'text-amber-700' : 'text-red-600'}`}>
                              {item.price} points
                            </span>
                          </div>
                          
                          {isOwned ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Owned
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => purchaseItem(item.id)}
                              disabled={!canAfford || purchasingId === item.id}
                              className="gap-2"
                            >
                              {purchasingId === item.id ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                  Purchasing...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3" />
                                  Purchase
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        
                        {/* Price Breakdown */}
                        <div className="text-xs text-muted-foreground">
                          {canAfford ? (
                            <span>Costs {item.price / 10} problems worth of points</span>
                          ) : (
                            <div className="text-red-600">
                              <div>Need {item.price - currentPoints} more points</div>
                              <div>Publish {moreProblemsNeeded} more problem{moreProblemsNeeded !== 1 ? 's' : ''}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>Publish problems to earn more points. Each problem = 10 points.</p>
          <p className="mt-1">Customizations appear instantly on your profile.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
