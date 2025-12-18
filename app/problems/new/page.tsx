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
import { X, Loader2, Bold, Italic, List, Link as LinkIcon, Heading, Quote, Code, Type, AlertTriangle } from "lucide-react"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"

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

const STATUS_OPTIONS = [
  { value: "open", label: "Open", description: "Problem is open for solutions" },
  { value: "in_progress", label: "In Progress", description: "Problem is being worked on" },
  { value: "solved", label: "Solved", description: "Problem has been solved" },
  { value: "closed", label: "Closed", description: "Problem is closed" },
  { value: "post", label: "Post", description: "General post or discussion" },
  { value: "announcement", label: "Announcement", description: "Important announcement" },
  { value: "project", label: "Project", description: "Project seeking collaborators" },
]

// Gemini API ключ
const GEMINI_API_KEY = "AIzaSyAe77eTrIa5FRKDgASOkF-D1PG8F0rzoVY"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent"

// Функция для AI-модерации
async function moderateWithAI(title: string, description: string): Promise<{ isAllowed: boolean; reason?: string }> {
  try {
    const prompt = `
Пожалуйста, проанализируй следующий контент и определи, можно ли его опубликовать на платформе для решения проблем. Оцени по этим критериям:

1. Содержит ли текст оскорбительные выражения, мат, ругательства или непристойности?
2. Является ли контент вредоносным, опасным или пропагандирующим насилие?
3. Содержит ли текст признаки брейнрота (бессмысленный набор слов, спам, повторяющиеся символы)?
4. Является ли контент законным и соответствующим общепринятым нормам морали?

Ответь ТОЛЬКО в формате JSON:
{
  "isAllowed": true/false,
  "reason": "Краткое объяснение на русском языке, если не разрешено"
}

Контент для проверки:

Заголовок: ${title}

Описание: ${description}
    `

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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
          maxOutputTokens: 500,
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    
    // Извлекаем JSON из ответа
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0])
        return {
          isAllowed: result.isAllowed === true,
          reason: result.reason || "Контент не соответствует правилам платформы"
        }
      } catch (e) {
        console.error("Failed to parse Gemini response:", e)
        return {
          isAllowed: false,
          reason: "Ошибка при проверке контента. Пожалуйста, переформулируйте текст."
        }
      }
    } else {
      // Если не нашли JSON, проверяем по ключевым словам в ответе
      const lowerResponse = responseText.toLowerCase()
      if (lowerResponse.includes("not allowed") || 
          lowerResponse.includes("отказано") || 
          lowerResponse.includes("запрещено") ||
          lowerResponse.includes("rejected")) {
        return {
          isAllowed: false,
          reason: "Контент не прошел автоматическую проверку"
        }
      }
      return { isAllowed: true }
    }
  } catch (error) {
    console.error("AI moderation failed:", error)
    // В случае ошибки API пропускаем модерацию, но предупреждаем пользователя
    return {
      isAllowed: true,
      reason: "Система проверки временно недоступна. Публикуя контент, вы подтверждаете, что он соответствует правилам платформы."
    }
  }
}

// Базовая проверка на плохие слова (дополнительная защита)
const BAD_WORDS = [
  // Русский мат (частично)
  'бля', 'блять', 'пизд', 'хуй', 'хуя', 'еба', 'ебал',
  // Английские плохие слова
  'fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy',
  // Другие непристойности
  'nigger', 'nigga', 'chink', 'kike', 'retard',
  // Brainrot шаблоны
  'skibidi', 'gyatt', 'rizzler', 'sigma', '🗣️🔥', '🗣️', '🔥🔥🔥',
  // Спам шаблоны
  '!!!!!!!!', '?????', '$$$$$', '&&&&&', '******'
]

function containsBadWords(text: string): boolean {
  const lowerText = text.toLowerCase()
  return BAD_WORDS.some(word => lowerText.includes(word))
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
  const [isModerating, setIsModerating] = useState(false)
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")
  
  const router = useRouter()
  const supabase = createClient()

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Функции форматирования текста
  const insertTextAtCursor = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = document.getElementById("description") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    const textToInsert = selectedText || defaultText
    
    const newText = description.substring(0, start) + before + textToInsert + after + description.substring(end)
    setDescription(newText)
    
    // Фокус обратно на textarea
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + textToInsert.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  const formatBold = () => {
    insertTextAtCursor("**", "**", "bold text")
  }

  const formatItalic = () => {
    insertTextAtCursor("*", "*", "italic text")
  }

  const formatHeading = () => {
    insertTextAtCursor("## ", "", "Heading")
  }

  const formatList = () => {
    insertTextAtCursor("- ", "", "List item")
  }

  const formatQuote = () => {
    insertTextAtCursor("> ", "", "Quote")
  }

  const formatCode = () => {
    insertTextAtCursor("```\n", "\n```", "code")
  }

  const formatInlineCode = () => {
    insertTextAtCursor("`", "`", "code")
  }

  const insertLink = () => {
    if (!linkUrl.trim()) {
      setLinkDialogOpen(true)
      return
    }
    
    if (!linkText.trim()) {
      setLinkText(linkUrl)
    }
    
    const markdownLink = `[${linkText.trim()}](${linkUrl.trim()})`
    insertTextAtCursor("", "", markdownLink)
    
    // Сбросить значения
    setLinkUrl("")
    setLinkText("")
    setLinkDialogOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading || isModerating) return
    
    setIsModerating(true)
    setError(null)
    setModerationWarning(null)

    // Валидация
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required")
      setIsModerating(false)
      return
    }

    // Базовая проверка на плохие слова
    if (containsBadWords(title) || containsBadWords(description)) {
      setError("Ваш контент содержит недопустимые слова или выражения. Пожалуйста, переформулируйте текст.")
      setIsModerating(false)
      return
    }

    try {
      // AI-модерация
      const moderationResult = await moderateWithAI(title.trim(), description.trim())
      
      if (!moderationResult.isAllowed) {
        setError(`Контент не прошел модерацию: ${moderationResult.reason}`)
        setIsModerating(false)
        return
      }

      if (moderationResult.reason) {
        setModerationWarning(moderationResult.reason)
      }

      setIsModerating(false)
      setIsLoading(true)

      const problemData = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        tags: tags.length > 0 ? tags : null,
        status: status || "open",
        contact: contact.trim() || null,
        looking_for_cofounder: lookingForCofounder,
        author_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (initialData) {
        // Update existing problem
        const { error: updateError } = await supabase
          .from("problems")
          .update(problemData)
          .eq("id", initialData.id)
          .eq("author_id", userId)

        if (updateError) {
          console.error("Update error:", updateError)
          throw new Error(`Failed to update: ${updateError.message}`)
        }
        
        router.push(`/problems/${initialData.id}`)
        router.refresh()
      } else {
        // Create new problem
        const { data, error: insertError } = await supabase
          .from("problems")
          .insert(problemData)
          .select("id")
          .single()

        if (insertError) {
          console.error("Insert error:", insertError)
          throw new Error(`Failed to create: ${insertError.message}`)
        }
        
        if (data?.id) {
          router.push(`/problems/${data.id}`)
          router.refresh()
        } else {
          throw new Error("No ID returned after creation")
        }
      }
    } catch (error: unknown) {
      console.error("Form submission error:", error)
      
      // Более информативные сообщения об ошибках
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          setError("Network error. Please check your connection.")
        } else if (error.message.includes("permission denied")) {
          setError("Permission denied. Please ensure you're logged in.")
        } else if (error.message.includes("status")) {
          setError("Database error. The 'status' field might not exist.")
        } else {
          setError(error.message)
        }
      } else {
        setError("An unexpected error occurred")
      }
      setIsModerating(false)
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
          {moderationWarning && !error && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Внимание</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                {moderationWarning}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Problem Title *</Label>
            <Input
              id="title"
              placeholder="What problem are you facing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={isLoading || isModerating}
            />
            <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description *</Label>
              <div className="text-xs text-muted-foreground">
                Supports Markdown formatting
              </div>
            </div>
            
            {/* Панель инструментов форматирования */}
            <TooltipProvider>
              <div className="flex items-center gap-1 p-2 border rounded-t-lg bg-muted/50">
                <ToggleGroup type="multiple" className="flex-wrap gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="bold" onClick={formatBold} disabled={isLoading || isModerating}>
                        <Bold className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bold (Ctrl+B)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="italic" onClick={formatItalic} disabled={isLoading || isModerating}>
                        <Italic className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Italic (Ctrl+I)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="heading" onClick={formatHeading} disabled={isLoading || isModerating}>
                        <Heading className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Heading</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="list" onClick={formatList} disabled={isLoading || isModerating}>
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bullet List</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="quote" onClick={formatQuote} disabled={isLoading || isModerating}>
                        <Quote className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quote</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="code" onClick={formatCode} disabled={isLoading || isModerating}>
                        <Code className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Code Block</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="inline-code" onClick={formatInlineCode} disabled={isLoading || isModerating}>
                        <Type className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inline Code</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                        <DialogTrigger asChild>
                          <ToggleGroupItem value="link" disabled={isLoading || isModerating}>
                            <LinkIcon className="h-4 w-4" />
                          </ToggleGroupItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Insert Link</DialogTitle>
                            <DialogDescription>
                              Add a hyperlink to your description
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="link-url">URL *</Label>
                              <Input
                                id="link-url"
                                placeholder="https://example.com"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="link-text">Text (optional)</Label>
                              <Input
                                id="link-text"
                                placeholder="Link text"
                                value={linkText}
                                onChange={(e) => setLinkText(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={insertLink} disabled={!linkUrl.trim()}>
                              Insert Link
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Insert Link (Ctrl+K)</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </div>
            </TooltipProvider>
            
            <Textarea
              id="description"
              placeholder="Describe the problem in detail... You can use Markdown for formatting."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              maxLength={2000}
              disabled={isLoading || isModerating}
              className="rounded-t-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
              <div className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Bold className="h-3 w-3" /> **bold**
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <Italic className="h-3 w-3" /> *italic*
                </span>
                <span className="mx-2">•</span>
                <span className="inline-flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" /> [text](url)
                </span>
              </div>
            </div>
          </div>

          {/* Status field - теперь всегда виден */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select 
              value={status} 
              onValueChange={setStatus} 
              disabled={isLoading || isModerating}
              required
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((statusOption) => (
                  <SelectItem 
                    key={statusOption.value} 
                    value={statusOption.value}
                  >
                    <div className="flex flex-col">
                      <span>{statusOption.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {statusOption.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact</Label>
            <Input
              id="contact"
              placeholder="Telegram, WhatsApp, or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading || isModerating}
            />
            <p className="text-xs text-muted-foreground">How can people reach you? (Optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading || isModerating}>
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
                disabled={isLoading || isModerating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5 || isLoading || isModerating}
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
                      disabled={isLoading || isModerating}
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
              disabled={isLoading || isModerating}
            />
            <Label htmlFor="cofounder" className="text-sm font-normal cursor-pointer">
              I'm looking for a cofounder to solve this problem
            </Label>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please check if the database has the required columns and RLS policies.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || isModerating} className="flex-1">
              {isModerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Проверка контента...
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={isLoading || isModerating}
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>Все публикации проходят автоматическую проверку на соответствие правилам платформы.</p>
            <p>Запрещены: мат, оскорбления, спам, брейнрот и непристойный контент.</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
