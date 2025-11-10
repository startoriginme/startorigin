"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowBigUp, Calendar, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Problem = {
  id: string
  title: string
  description: string
  category: string | null
  tags: string[] | null
  upvotes: number
  status: string
  created_at: string
  author_id: string
  looking_for_cofounder: boolean | null
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

type ProblemCardProps = {
  problem: Problem
  userId?: string
}

export function ProblemCard({ problem, userId }: ProblemCardProps) {
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCheckedUpvote, setHasCheckedUpvote] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkUpvoteStatus = async () => {
      if (!userId || hasCheckedUpvote) return

      const supabase = createClient()
      const { data } = await supabase
        .from("upvotes")
        .select("id")
        .eq("problem_id", problem.id)
        .eq("user_id", userId)
        .single()

      setIsUpvoted(!!data)
      setHasCheckedUpvote(true)
    }

    checkUpvoteStatus()
  }, [userId, problem.id, hasCheckedUpvote])

  const handleUpvote = async () => {
    if (!userId) {
      router.push("/auth/login")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      if (isUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from("upvotes")
          .delete()
          .eq("problem_id", problem.id)
          .eq("user_id", userId)

        if (!error) {
          setUpvotes((prev) => prev - 1)
          setIsUpvoted(false)
        }
      } else {
        // Add upvote
        const { error } = await supabase
          .from("upvotes")
          .insert({ problem_id: problem.id, user_id: userId })

        if (!error) {
          setUpvotes((prev) => prev + 1)
          setIsUpvoted(true)
        }
      }
    } catch (error) {
      console.error("Error toggling upvote:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()

    // Приводим оба времени к началу дня для корректного сравнения
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const problemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const diffInMs = today.getTime() - problemDate.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`

    return date.toLocaleDateString()
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
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  }

  const getStatusLabel = (status: string) => {
    if (status === "in_progress") return "In Progress"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0"> {/* ← Добавлен min-w-0 для правильного сокращения текста */}
            <Link href={`/problems/${problem.id}`}>
              <h3 className="mb-2 text-xl font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"> {/* ← line-clamp-2 для заголовка */}
                {problem.title}
              </h3>
            </Link>
            <p className="text-muted-foreground line-clamp-3"> {/* ← line-clamp-3 для описания */}
              {problem.description}
            </p>
          </div>
          <div className="flex-shrink-0"> {/* ← Кнопка upvote теперь не сжимается */}
            <Button
              variant={isUpvoted ? "default" : "outline"}
              size="sm"
              className="flex-col gap-1 h-auto py-2 px-3"
              onClick={handleUpvote}
              disabled={isLoading}
            >
              <ArrowBigUp className="h-5 w-5" />
              <span className="text-xs font-semibold">{upvotes}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-2">
          {problem.category && (
            <Badge variant="secondary">{getCategoryLabel(problem.category)}</Badge>
          )}
          {problem.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          <Badge
            variant={
              problem.status === "open"
                ? "default"
                : problem.status === "solved"
                  ? "secondary"
                  : "outline"
            }
          >
            {getStatusLabel(problem.status)}
          </Badge>
          {problem.looking_for_cofounder && (
            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
              <Users className="h-3 w-3" />
              Looking for Cofounder
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-3 min-w-0 flex-1"> {/* ← Добавлен min-w-0 и flex-1 */}
          <Avatar className="h-8 w-8 flex-shrink-0"> {/* ← Аватар не сжимается */}
            <AvatarImage src={problem.profiles?.avatar_url || undefined} />
            <AvatarFallback>
              {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm min-w-0 flex-1"> {/* ← Текст адаптируется под пространство */}
            <p className="font-medium text-foreground truncate"> {/* ← truncate для имени */}
              {problem.profiles?.display_name || problem.profiles?.username || "Anonymous"}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" /> {/* ← Иконка не сжимается */}
              <span className="truncate">{formatDate(problem.created_at)}</span> {/* ← truncate для даты */}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4"> {/* ← Кнопка View Details не сжимается */}
          <Link href={`/problems/${problem.id}`}>
            <Button variant="ghost" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
