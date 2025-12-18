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
import { X, Loader2, Bold, Italic, List, Link as LinkIcon, Heading, Quote, Code, Type, Sparkles } from "lucide-react"
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

// Add points to user
async function addPointsToUser(userId: string, points: number) {
  const supabase = createClient()
  
  try {
    // Get current points
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error fetching user points:", fetchError)
      return
    }

    const currentPoints = profile?.points || 0
    const newPoints = currentPoints + points

    // Update points in profiles table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating points:", updateError)
      return
    }

    // Create transaction record
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: points,
        type: "earned",
        description: "Published a problem",
        created_at: new Date().toISOString()
      })

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError)
    }

    console.log(`Added ${points} points to user ${userId}. Total: ${newPoints}`)
  } catch (error) {
    console.error("Error in addPointsToUser:", error)
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
  const [pointsAwarded, setPointsAwarded] = useState(false)
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

  // Text formatting functions
  const insertTextAtCursor = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = document.getElementById("description") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = description.substring(start, end)
    const textToInsert = selectedText || defaultText
    
    const newText = description.substring(0, start) + before + textToInsert + after + description.substring(end)
    setDescription(newText)
    
    // Focus back on textarea
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
    
    // Reset values
    setLinkUrl("")
    setLinkText("")
    setLinkDialogOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    setError(null)
    setPointsAwarded(false)

    // VALIDATION
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required")
      return
    }

    if (title.length < 10) {
      setError("Title must be at least 10 characters")
      return
    }

    if (description.length < 50) {
      setError("Description must be at least 50 characters")
      return
    }

    setIsLoading(true)

    try {
      // PREPARE DATA FOR DATABASE
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

      let problemId: string | null = null

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
        
        problemId = initialData.id
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
          problemId = data.id
          
          // AWARD 10 POINTS FOR PUBLISHING
          await addPointsToUser(userId, 10)
          setPointsAwarded(true)
          
          router.push(`/problems/${data.id}`)
          router.refresh()
        } else {
          throw new Error("No ID returned after creation")
        }
      }
    } catch (error: unknown) {
      console.error("Form submission error:", error)
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          setError("Network error. Please check your connection.")
        } else if (error.message.includes("permission denied")) {
          setError("Permission denied. Please ensure you're logged in.")
        } else {
          setError(error.message)
        }
      } else {
        setError("An unexpected error occurred")
      }
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
          {pointsAwarded && (
            <Alert className="bg-green-50 border-green-200">
              <Sparkles className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Points awarded!</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                You received <span className="font-bold">10 points</span> for publishing a problem! Use them for profile customizations.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Problem Title *</Label>
            <Input
              id="title"
              placeholder="What problem did you encounter?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
              {title.length < 10 && title.length > 0 && (
                <p className="text-xs text-amber-600">Minimum 10 characters</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description *</Label>
              <div className="text-xs text-muted-foreground">
                Markdown formatting supported
              </div>
            </div>
            
            {/* Formatting toolbar */}
            <TooltipProvider>
              <div className="flex items-center gap-1 p-2 border rounded-t-lg bg-muted/50">
                <ToggleGroup type="multiple" className="flex-wrap gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="bold" onClick={formatBold} disabled={isLoading}>
                        <Bold className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Bold (Ctrl+B)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="italic" onClick={formatItalic} disabled={isLoading}>
                        <Italic className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Italic (Ctrl+I)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="heading" onClick={formatHeading} disabled={isLoading}>
                        <Heading className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Heading</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="list" onClick={formatList} disabled={isLoading}>
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>List</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="quote" onClick={formatQuote} disabled={isLoading}>
                        <Quote className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quote</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="code" onClick={formatCode} disabled={isLoading}>
                        <Code className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Code block</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem value="inline-code" onClick={formatInlineCode} disabled={isLoading}>
                        <Type className="h-4 w-4" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inline code</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                        <DialogTrigger asChild>
                          <ToggleGroupItem value="link" disabled={isLoading}>
                            <LinkIcon className="h-4 w-4" />
                          </ToggleGroupItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Insert Link</DialogTitle>
                            <DialogDescription>
                              Add a hyperlink to the description
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
                      <p>Insert link (Ctrl+K)</p>
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
              disabled={isLoading}
              className="rounded-t-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
              {description.length < 50 && description.length > 0 && (
                <p className="text-xs text-amber-600">Minimum 50 characters</p>
              )}
            </div>
          </div>

          {/* Status field */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select 
              value={status} 
              onValueChange={setStatus} 
              disabled={isLoading}
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
              placeholder="Telegram, WhatsApp or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">How to contact you? (Optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
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
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5 || isLoading}
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
                      disabled={isLoading}
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
              disabled={isLoading}
            />
            <Label htmlFor="cofounder" className="text-sm font-normal cursor-pointer">
              I'm looking for a co-founder to solve this problem
            </Label>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {initialData ? "Updating..." : "Publishing..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {initialData ? "Update Problem" : "Publish Problem (+10 points)"}
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  )
}
