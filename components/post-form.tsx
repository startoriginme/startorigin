"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const categories = [
  "thoughts",
  "experience",
  "insights",
  "news",
  "tutorial",
  "question",
  "discussion",
  "announcement",
  "review",
  "other"
]

const popularTags = [
  "startup",
  "technology",
  "business",
  "marketing",
  "product",
  "design",
  "development",
  "funding",
  "growth",
  "community",
  "learning",
  "tips",
  "trends",
  "innovation",
  "career",
  "remote"
]

interface PostFormProps {
  userId: string
}

export function PostForm({ userId }: PostFormProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag])
      setCustomTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      // Create post
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        title,
        content,
        category,
        tags,
        status: "published"
      })

      if (error) throw error

      toast({
        title: "Post published!",
        description: "Your post has been shared with the community.",
      })

      router.push("/posts")
      router.refresh()
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to publish post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Post Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your post title"
            required
          />
        </div>

        <div>
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts, insights, or experiences..."
            rows={8}
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category (optional)" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tags (max 5, optional)</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(customTag.trim())
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(customTag.trim())}
                disabled={!customTag.trim() || tags.length >= 5}
              >
                Add
              </Button>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground mb-2">Popular tags:</p>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => tags.length < 5 && addTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Publishing..." : "Publish Post"}
        </Button>
      </div>
    </form>
  )
}
