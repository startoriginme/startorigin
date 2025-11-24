"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Crown, Star, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const topUsernames = {
  "1 Letter": ["x", "q", "z", "v", "k"],
  "2 Letters": ["ai", "io", "me", "tv", "ex", "vc", "gg", "cc", "yy", "zz"],
}

const priceMap = {
  1: 2000,
  2: 1750,
}

export function TopUsernames() {
  const [selectedUsername, setSelectedUsername] = useState<{username: string, price: number} | null>(null)

  return (
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
