// components/problem-animation-modal.tsx
"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProblemAnimationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAnimation: (animationType: string | null) => void
  currentAnimation: string | null
  isLoading: boolean
}

export function ProblemAnimationModal({
  isOpen,
  onClose,
  onSelectAnimation,
  currentAnimation,
  isLoading
}: ProblemAnimationModalProps) {
  if (!isOpen) return null

  const animations = [
    {
      id: 'let_it_snow',
      title: 'Let It Snow',
      description: 'Beautiful snow animation with blue background',
      preview: '❄️ Snowflakes falling with light blue background',
      badgeColor: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'merry_christmas',
      title: 'Merry Christmas',
      description: 'Christmas wreaths, bells and festive elements',
      preview: '🎄 Christmas trees, 🔔 bells with green-blue background',
      badgeColor: 'bg-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'stranger_things',
      title: 'Stranger Things',
      description: 'Red lightning effects with dark theme',
      preview: '⚡ Lightning effects with red/black theme',
      badgeColor: 'bg-red-500',
      bgColor: 'bg-red-950',
      borderColor: 'border-red-800'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Add Animation to Problem</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Содержимое */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Choose an animation to make your problem stand out! Animation will be visible both on the problem card and detail page.
          </p>

          {/* Вариант без анимации */}
          <Card className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${currentAnimation === null ? 'ring-2 ring-primary' : ''}`}
            onClick={() => onSelectAnimation(null)}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">No Animation</h3>
                <p className="text-sm text-muted-foreground">Standard look without animations</p>
              </div>
              {currentAnimation === null && (
                <Badge>Selected</Badge>
              )}
            </div>
          </Card>

          {/* Варианты анимаций */}
          {animations.map((anim) => (
            <Card
              key={anim.id}
              className={`p-4 cursor-pointer hover:opacity-90 transition-all ${currentAnimation === anim.id ? 'ring-2 ring-primary' : ''} ${anim.bgColor} ${anim.borderColor}`}
              onClick={() => onSelectAnimation(anim.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-lg">{anim.title}</h3>
                    <Badge className={anim.badgeColor}>
                      {anim.id === currentAnimation ? 'Selected' : 'Preview'}
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{anim.description}</p>
                  <p className="text-xs text-muted-foreground">{anim.preview}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Футер */}
        <div className="p-6 border-t flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Animation changes will be saved immediately
          </p>
        </div>
      </div>
    </div>
  )
}
