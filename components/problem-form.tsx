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
import { X, Loader2 } from "lucide-react"

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)

    // Валидация
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required")
      setIsLoading(false)
      return
    }

    try {
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
          </div>

          {/* Status field - теперь всегда виден */}
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
              placeholder="Telegram, WhatsApp, or Email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">How can people reach you? (Optional)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isLoading}>
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
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
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
