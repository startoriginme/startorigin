"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowBigUp, Calendar, Users, Check } from "lucide-react"
import { GiWhaleTail } from "react-icons/gi"
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

// Функция для получения значков пользователя
async function getUserBadges(userId: string): Promise<Array<{badge_type: 'verified' | 'whale' | 'early'}>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_type")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching user badges:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Error fetching user badges:", err)
    return []
  }
}

export function ProblemCard({ problem, userId }: ProblemCardProps) {
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [isUpvoted, setIsUpvoted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCheckedUpvote, setHasCheckedUpvote] = useState(false)
  const [authorBadges, setAuthorBadges] = useState<Array<{badge_type: 'verified' | 'whale' | 'early'}>>([])
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

  useEffect(() => {
    const fetchAuthorBadges = async () => {
      if (problem.author_id) {
        const badges = await getUserBadges(problem.author_id)
        setAuthorBadges(badges)
      }
    }
    
    fetchAuthorBadges()
  }, [problem.author_id])

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

  // Проверяем наличие значков
  const hasVerifiedBadge = authorBadges.some(b => b.badge_type === 'verified')
  const hasWhaleBadge = authorBadges.some(b => b.badge_type === 'whale')
  const hasEarlyBadge = authorBadges.some(b => b.badge_type === 'early')

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
        {/* Используем CSS Grid для жесткого контроля */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          {/* Левая колонка - контент */}
          <div className="min-w-0">
            <Link href={`/problems/${problem.id}`}>
              <h3 className="mb-2 text-xl font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 break-words">
                {problem.title}
              </h3>
            </Link>
            <p className="text-muted-foreground line-clamp-3 break-words">
              {problem.description}
            </p>
          </div>
          
          {/* Правая колонка - upvote (фиксированная ширина) */}
          <div className="w-12 flex justify-end">
            <Button
              variant={isUpvoted ? "default" : "outline"}
              size="sm"
              className="flex-col gap-1 h-auto py-2 px-3 w-12"
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
        {/* Автор и дата */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Кастомный аватар с галочкой верификации */}
          <div className="relative h-8 w-8 flex-shrink-0">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-muted">
              {problem.profiles?.avatar_url ? (
                <img
                  src={problem.profiles.avatar_url}
                  alt="Profile avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
                  </span>
                </div>
              )}
            </div>
            {/* Галочка верификации на аватаре (синяя) */}
            {hasVerifiedBadge && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5 border border-background">
                <Check className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
          <div className="text-sm min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 truncate">
                <p className="font-medium text-foreground truncate">
                  {problem.profiles?.display_name || problem.profiles?.username || "Anonymous"}
                </p>
                {/* BadgeCheck рядом с именем */}
                {hasVerifiedBadge && (
                  <Check className="h-3 w-3 text-blue-500 flex-shrink-0" title="Verified" />
                )}
              </div>
              {/* Значки whale и early */}
              {(hasWhaleBadge || hasEarlyBadge) && (
                <div className="flex items-center gap-1">
                  {hasWhaleBadge && (
                    <Badge 
                      variant="outline" 
                      className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 px-1.5 py-0 h-4"
                      title="Whale"
                    >
                      <GiWhaleTail className="h-3 w-3" />
                    </Badge>
                  )}
                  {hasEarlyBadge && (
                    <Badge 
                      variant="outline" 
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 px-1.5 py-0 h-4"
                      title="Early Supporter"
                    >
                      <GiWhaleTail className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatDate(problem.created_at)}</span>
            </div>
          </div>
        </div>
        
        {/* Кнопка View Details */}
        <div className="flex-shrink-0 ml-4">
          <Link href={`/problems/${problem.id}`}>
            <Button variant="ghost" size="sm" className="whitespace-nowrap">
              View Details
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}  
