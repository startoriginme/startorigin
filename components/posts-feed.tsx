"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MessageSquare, ArrowUp, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Post = {
  id: string
  title: string
  content: string
  category: string | null
  tags: string[] | null
  status: string
  created_at: string
  author_id: string
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface PostsFeedProps {
  initialPosts: Post[]
  userId?: string
}

export function PostsFeed({ initialPosts, userId }: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getCategoryLabel = (category: string) => {
    if (!category) return "Other"
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  }

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  return (
    <div className="space-y-4">
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-6">Be the first to share your thoughts!</p>
          <Link href="/problems/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Post
            </Button>
          </Link>
        </div>
      ) : (
        posts.map((post) => (
          <Card key={post.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <Link href={`/posts/${post.id}`}>
                <h3 className="mb-2 text-xl font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 break-words">
                  {post.title}
                </h3>
              </Link>
              <p className="text-muted-foreground line-clamp-3 break-words">
                {truncateContent(post.content)}
              </p>
            </CardHeader>

            <CardContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {post.category && (
                  <Badge variant="secondary">{getCategoryLabel(post.category)}</Badge>
                )}
                {post.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                <Badge
                  variant={
                    post.status === "published" ? "default" : 
                    post.status === "draft" ? "outline" : 
                    "secondary"
                  }
                >
                  {post.status === "published" ? "Published" : 
                   post.status === "draft" ? "Draft" : 
                   post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                </Badge>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={post.profiles?.avatar_url || ""} 
                    alt="Profile avatar"
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(post.profiles?.display_name || post.profiles?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {post.profiles?.display_name || post.profiles?.username || "Anonymous"}
                  </p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formatDate(post.created_at)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Link href={`/posts/${post.id}`}>
                  <Button variant="ghost" size="sm" className="gap-2 whitespace-nowrap">
                    <Eye className="h-4 w-4" />
                    Read More
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )
}
