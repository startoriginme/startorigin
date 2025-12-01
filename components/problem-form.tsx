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
import { X, Loader2, AlertCircle, Sparkles } from "lucide-react"

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

// Список запрещенных и плохих слов (частично)
const BAD_WORDS = [
  // Маты (части слов)
  "хуй", "пизд", "еба", "бля", "гондон", "мудак", "долбоёб",
  // Английские плохие слова
  "fuck", "shit", "asshole", "bitch", "dick", "pussy", "cunt",
  // Оскорбительные выражения
  "сука", "член", "трах", "секс", "секас"
]

// Функция проверки через Gemini AI (более дружелюбная)
async function checkProblemWithAI(title: string, description: string): Promise<{approved: boolean, message?: string}> {
  try {
    const apiKey = "AIzaSyDGXbeDZsUEJJi8NX2la9_rpU7-H2SsrGE"
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const prompt = `Ты - дружелюбный помощник для платформы StartOrigin. Оцени, можно ли опубликовать этот контент.

Критерии ОДОБРЕНИЯ (разреши если):
1. Это нормальный текст на русском или английском (не бессмысленный набор символов)
2. Нет явного спама, матов или оскорбительных слов
3. Контент не является явной шуткой/троллингом по типу "Я не прекращаю пукать"

Критерии ОТКЛОНЕНИЯ (отклони только если):
1. Это явный спам или реклама
2. Содержатся маты, оскорбления или неприличный контент
3. Это совсем бессмысленный текст без осмысленных слов
4. Очень глупый/детский юмор, не подходящий для бизнес-платформы

Если текст просто не идеален, но нормальный - разреши. Если это просто новость или мысль - разреши.
Если сомневаешься - разреши.

Заголовок: "${title.substring(0, 100)}"
Описание: "${description.substring(0, 500)}"

Ответь в формате JSON:
{
  "approved": true/false,
  "message": "Краткое объяснение на английском (если не approved)"
}`

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
          maxOutputTokens: 200,
        }
      })
    })

    if (!response.ok) {
      console.error("API error:", await response.text())
      return { approved: true } // В случае ошибки разрешаем
    }

    const data = await response.json()
    const aiResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
    
    console.log("AI Response:", aiResponse)
    
    try {
      // Пытаемся распарсить JSON ответ
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          approved: parsed.approved === true || parsed.approved === undefined,
          message: parsed.message
        }
      }
      
      // Если не JSON, анализируем текст
      const cleanResponse = aiResponse.toLowerCase().trim()
      
      // Если явно говорится об отклонении
      if (cleanResponse.includes('reject') || 
          cleanResponse.includes('not approved') ||
          cleanResponse.includes('spam') ||
          cleanResponse.includes('inappropriate')) {
        return { 
          approved: false,
          message: "Content contains spam or inappropriate material"
        }
      }
      
      // По умолчанию разрешаем
      return { approved: true }
      
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      return { approved: true } // При ошибке парсинга разрешаем
    }
    
  } catch (error) {
    console.error("Gemini AI проверка не удалась:", error)
    return { approved: true } // При ошибке разрешаем
  }
}

// Базовая проверка на явный спам и маты
function basicContentCheck(text: string): {valid: boolean, message?: string} {
  if (!text || text.trim().length === 0) {
    return { valid: false, message: "Text cannot be empty" }
  }
  
  // Минимальная длина - 10 символов (очень мало, но допустимо для заголовка)
  if (text.trim().length < 10) {
    return { valid: false, message: "Text is too short. Minimum 10 characters required." }
  }
  
  const lowerText = text.toLowerCase()
  
  // Проверка на маты и плохие слова
  for (const badWord of BAD_WORDS) {
    if (lowerText.includes(badWord)) {
      return { valid: false, message: "Content contains inappropriate language" }
    }
  }
  
  // Проверка на явный спам (много повторяющихся символов) - только для длинных текстов
  if (text.length > 20) {
    const repeatedCharPattern = /(.)\1{8,}/ // 9+ одинаковых символов подряд (только для явного спама)
    if (repeatedCharPattern.test(text)) {
      return { valid: false, message: "Text appears to be spam" }
    }
  }
  
  // Проверка на слишком много специальных символов (более 50%) - только для длинных текстов
  if (text.length > 30) {
    const specialChars = text.replace(/[a-zа-яё0-9\s.,!?;:'"()-]/gi, '').length
    if (specialChars > text.length * 0.5) { // 50% спецсимволов
      return { valid: false, message: "Too many special characters" }
    }
  }
  
  return { valid: true }
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
      // Базовая проверка на маты и явный спам
      const titleCheck = basicContentCheck(title)
      const descCheck = basicContentCheck(description)
      
      if (!titleCheck.valid) {
        setError(`Title: ${titleCheck.message}`)
        setIsValidating(false)
        return
      }
      
      if (!descCheck.valid) {
        setError(`Description: ${descCheck.message}`)
        setIsValidating(false)
        return
      }
      
      // Проверка через Gemini AI (более интеллектуальная)
      const aiCheck = await checkProblemWithAI(title, description)
      
      if (!aiCheck.approved) {
        setError(aiCheck.message || "Origin AI checked the content and found it inappropriate. Please make sure your content is respectful and meaningful.")
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
            <Label htmlFor="title">Share your idea or problem *</Label>
            <Input
              id="title"
              placeholder="What's on your mind? Share an idea, problem, or observation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters. Minimum 10 characters.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your thoughts in detail. This could be a problem you've noticed, an idea you have, or something interesting you observed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              maxLength={2000}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/2000 characters. Minimum 10 characters. Be creative, share your thoughts!
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact (Optional)</Label>
            <Input
              id="contact"
              placeholder="Telegram, WhatsApp, or Email if you want people to reach you"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading || isValidating}
            />
            <p className="text-xs text-muted-foreground">Optional: Add contact if you're open to discussion</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading || isValidating}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category if applicable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Thoughts</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tags to help others find your post"
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
              I'm open to finding collaborators for this idea
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
                <SelectItem value="open">Open for Discussion</SelectItem>
                <SelectItem value="in_progress">Working on It</SelectItem>
                <SelectItem value="solved">Solved/Completed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Friendly Content Check</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  We just do a quick check to keep the community friendly:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>✅ Minimum 10 characters for title and description</li>
                  <li>✅ No offensive language or hate speech</li>
                  <li>✅ No obvious spam (like "aaaaaaaaaaa")</li>
                  <li>✅ Normal text in any language is welcome</li>
                  <li>✅ Share ideas, thoughts, problems - all good!</li>
                </ul>
                <p className="mt-2 text-blue-600">
                  Most normal posts will be approved! ✨
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Content Needs Adjustment</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>{error}</p>
                  <p className="mt-2">
                    Please adjust your content to meet our simple guidelines above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading || isValidating} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            {isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Checking content...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {initialData ? "Updating..." : "Sharing with Community..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {initialData ? "Update Post" : "Share with Community"}
              </>
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
