"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Loader2, AlertCircle } from "lucide-react"

type ProblemFormProps = {
  userId: string
  initialData?: {
    id: string
    title: string
    description: string
    category: string | null
    tags: string[] | null
    status: string
    contact: string | null
    looking_for_cofounder: boolean | null
  }
}

const CATEGORIES = [
  "technology",
  "business",
  "healthcare",
  "education",
  "environment",
  "transportation",
  "finance",
  "social",
  "food",
  "energy",
  "housing",
  "entertainment",
  "sports",
  "other",
]

// Функция проверки проблемы через Gemini AI
async function checkProblemWithAI(title: string, description: string): Promise<boolean> {
  try {
    const apiKey = "AIzaSyDGXbeDZsUEJJi8NX2la9_rpU7-H2SsrGE"
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const prompt = `
      Проверь следующий текст проблемы для стартап-сообщества StartOrigin и ответь ТОЛЬКО "APPROVED" или "REJECTED" без каких-либо других слов:
      
      КРИТЕРИИ ОДОБРЕНИЯ:
      1. Проблема должна быть реальной и актуальной (не спам типа "ldfffsdjvlkdsfvjld" или бессмысленный текст)
      2. Проблема должна быть серьезной и относящейся к бизнесу, технологиям, образованию, здоровью, экологии или социальным вопросам
      3. Не должна быть глупой/шутливой (например, "Я не прекращаю пукать" или подобное)
      4. Должна иметь потенциал для решения через инновации/стартапы
      5. Минимальная длина - 20 осмысленных символов
      6. Должна быть сформулирована четко и понятно
      
      Текст проблемы:
      Заголовок: "${title}"
      Описание: "${description}"
      
      Ответь ТОЛЬКО "APPROVED" или "REJECTED":
    `

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 10,
        }
      })
    })

    if (!response.ok) {
      console.error("API error:", await response.text())
      throw new Error(`API request failed with status ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    const cleanResponse = aiResponse.trim().toUpperCase()
    
    console.log("AI Response:", cleanResponse)
    
    return cleanResponse === "APPROVED"
    
  } catch (error) {
    console.error("Gemini AI проверка не удалась:", error)
    // В случае ошибки API разрешаем публикацию, но логируем ошибку
    return true
  }
}

export function ProblemForm({ userId, initialData }: ProblemFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [category, setCategory] = useState(initialData?.category || "")
  const [contact, setContact] = useState(initialData?.contact || "")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [status, setStatus] = useState(initialData?.status || "open")
  const [lookingForCofounder, setLookingForCofounder] = useState(initialData?.looking_for_cofounder || false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const router = useRouter()

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading || isValidating) return
    
    setIsValidating(true)
    setError(null)

    try {
      // Проверяем проблему через Gemini AI
      const isProblemValid = await checkProblemWithAI(title, description)
      
      if (!isProblemValid) {
        setError("Origin AI checked the problem content and it's unacceptable for StartOrigin. Please, make the problem acceptable for publishing.")
        setIsValidating(false)
        return
      }
      
      setIsValidating(false)
      setIsLoading(true)
      
      const supabase = createClient()

      if (initialData) {
        // Update existing problem
        const { error } = await supabase
          .from("problems")
          .update({
            title,
            description,
            category: category || null,
            tags: tags.length > 0 ? tags : null,
            status,
            contact: contact || null,
            looking_for_cofounder: lookingForCofounder,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id)
          .eq("author_id", userId)

        if (error) throw error
        
        router.push(`/problems/${initialData.id}`)
        router.refresh()
      } else {
        // Create new problem
        const { data, error } = await supabase
          .from("problems")
          .insert({
            title,
            description,
            category: category || null,
            tags: tags.length > 0 ? tags : null,
            contact: contact || null,
            looking_for_cofounder: lookingForCofounder,
            author_id: userId,
          })
          .select()
          .single()

        if (error) throw error
        
        router.push(`/problems/${data.id}`)
        router.refresh()
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsValidating(false)
      setIsLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Problem Title *</Label>
            <Input
              id="title"
              placeholder="What problem are you facing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the problem in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              maxLength={2000}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 characters. Please describe your problem clearly and seriously.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              placeholder="Telegram, WhatsApp, or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">How can people reach you? (Optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading || isValidating}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                disabled={isLoading || isValidating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5 || isLoading || isValidating}
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTag(tag)} 
                      className="ml-1 hover:text-destructive"
                      disabled={isLoading || isValidating}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cofounder"
              checked={lookingForCofounder}
              onCheckedChange={(checked) => setLookingForCofounder(checked as boolean)}
              disabled={isLoading || isValidating}
            />
            <Label htmlFor="cofounder" className="text-sm font-normal cursor-pointer">
              I'm looking for a cofounder to solve this problem
            </Label>
          </div>

          {initialData && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isLoading || isValidating}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="solved">Solved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">AI Validation</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    All problems are automatically checked by Origin AI to ensure they are:
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Real and meaningful (no spam or gibberish)</li>
                    <li>Serious and related to startups/business/innovation</li>
                    <li>Clearly formulated with problem-solving potential</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-destructive">Submission Error</h3>
                  <div className="mt-2 text-sm text-destructive">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || isValidating} className="flex-1">
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Validating with AI...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {initialData ? "Updating..." : "Publishing..."}
                </>
              ) : (
                initialData ? "Update Problem" : "Publish Problem"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading || isValidating}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
