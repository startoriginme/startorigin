"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Check, X, Crown, Star, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function UsernameSearch() {
  const [username, setUsername] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<{
    available: boolean
    price?: number
    length: number
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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
    
    // Simulate API call to check username availability
    setTimeout(() => {
      const length = username.length
      const isAvailable = Math.random() > 0.7 // 30% chance of being available for demo
      
      setResult({
        available: isAvailable,
        price: isAvailable ? calculatePrice(length) : undefined,
        length
      })
      setIsChecking(false)
    }, 1000)
  }

  const handlePurchase = () => {
    setIsModalOpen(true)
  }

  return (
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
    </div>
  )
}
