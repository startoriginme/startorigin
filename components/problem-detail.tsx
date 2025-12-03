"use client"

import { useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users, MoreVertical, Share2, Copy, Twitter, MessageCircle, Flag, Shield, Check, Heart, User, Sprout } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean | null
}

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
  contact: string | null
  looking_for_cofounder: boolean | null
  profiles: Profile | null
}

type InterestedUser = {
  id: string
  user_id: string
  created_at: string
  profiles: Profile
}

type ProblemDetailProps = {
  problem: Problem
  userId?: string
  initialHasUpvoted: boolean
  initialIsInterested?: boolean
  initialInterestedCount?: number
}

// Карта алиасов пользователей
const userAliases: Record<string, string[]> = {
  "nikolaev": ["azya", "nklv"],
  "gerxog": ["admin"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv", "bolt"]
}

// Функция для получения основного username по алиасу
function getMainUsername(username: string): string {
  for (const [mainUsername, aliases] of Object.entries(userAliases)) {
    if (mainUsername === username || aliases.includes(username)) {
      return mainUsername
    }
  }
  return username
}

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string): string[] {
  return [mainUsername, ...(userAliases[mainUsername] || [])]
}

// Функция для получения алиасов из базы данных
async function getDatabaseAliases(userId: string): Promise<string[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from("user_aliases")
      .select("alias")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching database aliases:", error)
      return []
    }

    return data?.map(item => item.alias) || []
  } catch (err) {
    console.error("Error fetching database aliases:", err)
    return []
  }
}

// Функция для объединения статических и базы данных алиасов
async function getAllUsernamesCombined(mainUsername: string, userId?: string): Promise<string[]> {
  const staticAliases = getAllUsernames(mainUsername)
  
  if (!userId) {
    return staticAliases
  }

  try {
    const databaseAliases = await getDatabaseAliases(userId)
    
    // Объединяем и убираем дубликаты
    const allAliases = [...staticAliases]
    databaseAliases.forEach(alias => {
      if (!allAliases.includes(alias)) {
        allAliases.push(alias)
      }
    })
    
    return allAliases
  } catch (err) {
    console.error("Error combining aliases:", err)
    return staticAliases
  }
}

// Функция для преобразования текста с упоминаниями в ссылки
const parseMentions = (text: string): ReactNode => {
  if (!text) return text;
  
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const username = match[1];
    const mainUsername = getMainUsername(username)
    parts.push(
      <Link
        key={match.index}
        href={`/user/${mainUsername}`}
        className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Всегда возвращаем React элемент
  if (parts.length === 0) {
    return <>{text}</>;
  }
  
  return <>{parts}</>;
};

// Список подтвержденных пользователей
const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]

export function ProblemDetail({ 
  problem, 
  userId, 
  initialHasUpvoted,
  initialIsInterested = false,
  initialInterestedCount = 0
}: ProblemDetailProps) {
  const [isClient, setIsClient] = useState(false)
  const [upvotes, setUpvotes] = useState(problem.upvotes || 0)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [authorAllUsernames, setAuthorAllUsernames] = useState<string[]>([])
  const [isInterested, setIsInterested] = useState(initialIsInterested)
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount || 0)
  const [isInterestedLoading, setIsInterestedLoading] = useState(false)
  const [interestedUsers, setInterestedUsers] = useState<InterestedUser[]>([])
  const [showInterestedDialog, setShowInterestedDialog] = useState(false)
  const [isLoadingInterestedUsers, setIsLoadingInterestedUsers] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
    loadInterestedUsers()
  }, [])

  useEffect(() => {
    const fetchAuthorAliases = async () => {
      if (problem.profiles?.username && problem.author_id) {
        const usernames = await getAllUsernamesCombined(
          problem.profiles.username, 
          problem.author_id
        )
        setAuthorAllUsernames(usernames)
      } else if (problem.profiles?.username) {
        setAuthorAllUsernames(getAllUsernames(problem.profiles.username))
      }
    }
    
    fetchAuthorAliases()
  }, [problem.profiles?.username, problem.author_id])

  const isAuthor = userId === problem.author_id
  
  const authorMainUsername = problem.profiles?.username ? getMainUsername(problem.profiles.username) : null
  const isVerifiedUser = authorMainUsername ? verifiedUsers.includes(authorMainUsername) : false

  const handleUpvote = async () => {
    if (!userId) {
      router.push("/auth/login")
      return
    }

    setIsUpvoting(true)
    const supabase = createClient()

    try {
      if (hasUpvoted) {
        const { error } = await supabase
          .from("upvotes")
          .delete()
          .eq("problem_id", problem.id)
          .eq("user_id", userId)

        if (!error) {
          setUpvotes((prev) => prev - 1)
          setHasUpvoted(false)
        }
      } else {
        const { error } = await supabase
          .from("upvotes")
          .insert({ problem_id: problem.id, user_id: userId })

        if (!error) {
          setUpvotes((prev) => prev + 1)
          setHasUpvoted(true)
        }
      }
    } catch (error) {
      console.error("Error toggling upvote:", error)
    } finally {
      setIsUpvoting(false)
    }
  }

  const handleInterested = async () => {
    if (!userId) {
      router.push("/auth/login")
      return
    }

    setIsInterestedLoading(true)
    const supabase = createClient()

    try {
      if (isInterested) {
        const { error } = await supabase
          .from("interested_users")
          .delete()
          .eq("problem_id", problem.id)
          .eq("user_id", userId)

        if (!error) {
          setInterestedCount((prev) => prev - 1)
          setIsInterested(false)
          setInterestedUsers(prev => prev.filter(user => user.user_id !== userId))
        }
      } else {
        const { error } = await supabase
          .from("interested_users")
          .insert({ 
            problem_id: problem.id, 
            user_id: userId 
          })

        if (!error) {
          setInterestedCount((prev) => prev + 1)
          setIsInterested(true)
          
          // Добавляем текущего пользователя в список
          const { data: currentUserProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single()
            
          if (currentUserProfile) {
            setInterestedUsers(prev => [...prev, {
              id: Date.now().toString(),
              user_id: userId,
              created_at: new Date().toISOString(),
              profiles: currentUserProfile
            }])
          }
        }
      }
    } catch (error) {
      console.error("Error toggling interest:", error)
    } finally {
      setIsInterestedLoading(false)
    }
  }

  const loadInterestedUsers = async () => {
    if (!problem.id) return
    
    setIsLoadingInterestedUsers(true)
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase
        .from("interested_users")
        .select(`
          id,
          user_id,
          created_at,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            bio,
            is_verified
          )
        `)
        .eq("problem_id", problem.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading interested users:", error)
        return
      }

      setInterestedUsers(data || [])
      
      // Обновляем счетчик на основе данных
      setInterestedCount(data?.length || 0)
    } catch (error) {
      console.error("Error loading interested users:", error)
    } finally {
      setIsLoadingInterestedUsers(false)
    }
  }

  const handleShowInterestedUsers = async () => {
    setShowInterestedDialog(true)
    if (interestedUsers.length === 0) {
      await loadInterestedUsers()
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("problems")
        .delete()
        .eq("id", problem.id)
        .eq("author_id", userId!)

      if (!error) {
        router.push("/problems")
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting problem:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = async () => {
    if (!isClient) return;
    
    const url = `${window.location.origin}/problems/${problem.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Problem link has been copied to clipboard",
      })
      setIsShareOpen(false)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const shareOnTwitter = () => {
    if (!isClient) return;
    
    const text = `Take a look on ${problem.profiles?.username || "someone"}'s problem on StartOrigin.me - it's a platform, where you can publish problems you face and find co-founders to solve it.`
    const url = `${window.location.origin}/problems/${problem.id}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
  }

  const shareOnTelegram = () => {
    if (!isClient) return;
    
    const text = `Take a look on ${problem.profiles?.username || "someone"}'s problem on StartOrigin.me - it's a platform, where you can publish problems you face and find co-founders to solve it.`
    const url = `${window.location.origin}/problems/${problem.id}`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(telegramUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
  }

  const handleReport = () => {
    if (!isClient) return;
    
    const googleFormUrl = "https://forms.gle/RPUEPZBQEJHZT4GFA"
    const prefillUrl = `${googleFormUrl}?entry.123456789=${encodeURIComponent(problem.title)}&entry.987654321=${encodeURIComponent(window.location.href)}`
    
    window.open(prefillUrl, '_blank', 'noopener,noreferrer')
    
    toast({
      title: "Opening Report Form",
      description: "You'll be redirected to Google Forms to submit your report",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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

  const getContactIcon = (contact: string) => {
    if (contact.includes("+") || /^\d+$/.test(contact)) return <Phone className="h-4 w-4" />
    return <Mail className="h-4 w-4" />
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return formatDate(dateString)
  }

  // Если не клиент, возвращаем базовую разметку
  if (!isClient) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Problem Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Заголовок и кнопки действий */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 break-words">
                  {problem.title}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {problem.category && <Badge variant="secondary">{getCategoryLabel(problem.category)}</Badge>}
                  {problem.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <Badge
                    variant={
                      problem.status === "open" ? "default" : problem.status === "solved" ? "secondary" : "outline"
                    }
                    className="text-xs"
                  >
                    {getStatusLabel(problem.status)}
                  </Badge>
                  {problem.looking_for_cofounder && (
                    <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-xs">
                      <Users className="h-3 w-3" />
                      Looking for Cofounder
                    </Badge>
                  )}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {!isAuthor && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 bg-transparent text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-1 sm:flex-none"
                      >
                        <Flag className="h-4 w-4" />
                        <span className="hidden xs:inline">Report</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Report Problem</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          If you believe this problem violates our community guidelines or contains inappropriate content, 
                          you can report it using Google Forms.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="mt-0 sm:mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleReport}
                          className="bg-orange-600 text-white hover:bg-orange-700"
                        >
                          <Flag className="h-4 w-4 mr-2" />
                          Open Report Form
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {isAuthor && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="hidden sm:flex gap-2 flex-1 sm:flex-none">
                      <Link href={`/problems/${problem.id}/edit`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full sm:w-auto">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      </Link>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to delete this problem? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="mt-0 sm:mt-0">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <div className="sm:hidden flex-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full">
                            <MoreVertical className="h-4 w-4" />
                            <span>Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild>
                            <Link href={`/problems/${problem.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" />
                              Edit Problem
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => document.querySelector('[data-delete-trigger]')?.click()}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Problem
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button data-delete-trigger className="hidden" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to delete this problem? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                            <AlertDialogCancel className="mt-0 sm:mt-0">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upvote, Interested и мета-информация */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                {/* Upvote Button */}
                <Button
                  variant={hasUpvoted ? "default" : "outline"}
                  size="sm"
                  className="flex-col gap-1 h-auto py-2 px-3 min-w-[60px]"
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                >
                  <ArrowBigUp className="h-5 w-5" />
                  <span className="text-sm font-semibold">{upvotes}</span>
                </Button>

                {/* Interested Button - ЗЕЛЕНАЯ */}
                <div className="flex flex-col items-center">
                  <Button
                    variant={isInterested ? "default" : "outline"}
                    size="sm"
                    className={`
                      flex-col gap-1 h-auto py-2 px-3 min-w-[60px] 
                      ${isInterested 
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                        : 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700 hover:text-green-800'
                      }
                    `}
                    onClick={handleInterested}
                    disabled={isInterestedLoading}
                  >
                    <Sprout className="h-5 w-5" />
                    <span className="text-sm font-semibold">{interestedCount}</span>
                  </Button>
                  <button
                    onClick={handleShowInterestedUsers}
                    className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                  >
                    Interested
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(problem.created_at)}</span>
                  </div>
                  
                  <div className="relative">
                    <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                          <Share2 className="h-4 w-4" />
                          <span className="hidden xs:inline">Share</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareOnTwitter} className="cursor-pointer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Share on X
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={shareOnTelegram} className="cursor-pointer">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Share on Telegram
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed break-words">
              {parseMentions(problem.description)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Author Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">About the Author</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Link 
              href={authorMainUsername ? `/user/${authorMainUsername}` : "#"}
              className={authorMainUsername ? "cursor-pointer" : "cursor-default"}
            >
              <div className="relative h-16 w-16">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                  {problem.profiles?.avatar_url ? (
                    <img
                      src={problem.profiles.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
                      </span>
                    </div>
                  )}
                </div>
                {isVerifiedUser && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-background">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {authorMainUsername ? (
                  <Link 
                    href={`/user/${authorMainUsername}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors break-words flex items-center gap-1"
                  >
                    {problem.profiles?.display_name || authorMainUsername}
                    {isVerifiedUser && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground break-words flex items-center gap-1">
                    {problem.profiles?.display_name || "Anonymous"}
                    {isVerifiedUser && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </h3>
                )}
              </div>
              
              {authorAllUsernames.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  {authorAllUsernames.map((userName, index) => (
                    <span key={userName} className="text-sm text-muted-foreground">
                      @{userName}
                      {index < authorAllUsernames.length - 1 && <span>, </span>}
                    </span>
                  ))}
                </div>
              )}
              
              {problem.profiles?.bio && (
                <p className="mt-2 text-sm text-muted-foreground break-words">{problem.profiles.bio}</p>
              )}

              {problem.contact && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getContactIcon(problem.contact)}
                    <span className="font-mono break-all">{problem.contact}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interested Users Dialog */}
      <Dialog open={showInterestedDialog} onOpenChange={setShowInterestedDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Interested in Developing</DialogTitle>
            <DialogDescription>
              {interestedCount} {interestedCount === 1 ? 'person is' : 'people are'} interested in this problem
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {isLoadingInterestedUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : interestedUsers.length === 0 ? (
              <div className="text-center py-8">
                <ThumbsUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No one has shown interest yet</p>
                <p className="text-sm text-muted-foreground mt-2">Be the first to click "Interested"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interestedUsers.map((user) => {
                  const userMainUsername = user.profiles.username ? getMainUsername(user.profiles.username) : null
                  const isUserVerified = userMainUsername ? verifiedUsers.includes(userMainUsername) : false
                  
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                      <Link 
                        href={userMainUsername ? `/user/${userMainUsername}` : "#"}
                        className="flex-shrink-0"
                        onClick={() => setShowInterestedDialog(false)}
                      >
                        <Avatar className="h-10 w-10 border-2 border-background">
                          <AvatarImage src={user.profiles.avatar_url || ""} />
                          <AvatarFallback>
                            {getInitials(user.profiles.display_name || user.profiles.username)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link 
                            href={userMainUsername ? `/user/${userMainUsername}` : "#"}
                            className="font-medium text-foreground hover:text-primary transition-colors truncate"
                            onClick={() => setShowInterestedDialog(false)}
                          >
                            {user.profiles.display_name || userMainUsername || "User"}
                          </Link>
                          {isUserVerified && (
                            <Check className="h-4 w-4 text-blue-500 flex-shrink-0" title="Verified" />
                          )}
                        </div>
                        {userMainUsername && (
                          <p className="text-sm text-muted-foreground truncate">@{userMainUsername}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Interested {formatRelativeTime(user.created_at)}
                        </p>
                      </div>
                      
                      <ThumbsUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button
              variant={isInterested ? "default" : "outline"}
              className={`
                w-full gap-2
                ${isInterested 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700 hover:text-green-800'
                }
              `}
              onClick={() => {
                handleInterested()
                if (!isInterested) {
                  setShowInterestedDialog(false)
                  toast({
                    title: "Interest shown!",
                    description: "You've shown interest in this problem",
                  })
                }
              }}
              disabled={isInterestedLoading}
            >
              <ThumbsUp className="h-4 w-4" />
              {isInterested ? "You're Interested" : "I'm Interested"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Moderation Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                Do you want to moderate problems with us?
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Help us maintain a high-quality community by reviewing and moderating content. 
                Pass a test and we can discuss conditions of your work.
              </p>
            </div>

            <Button 
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              size="lg"
            >
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSd2tJLo1tfTqwYeuOACX126ZoYWk9Iegl4CZHqozXNJSJSiMw/viewform?usp=dialog" 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Shield className="h-4 w-4" />
                Pass a test
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
