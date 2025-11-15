"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users, MoreVertical, Share2, Copy, Twitter, MessageCircle } from "lucide-react"
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
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

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

type ProblemDetailProps = {
  problem: Problem
  userId?: string
  initialHasUpvoted: boolean
}

export function ProblemDetail({ problem, userId, initialHasUpvoted }: ProblemDetailProps) {
  const [isClient, setIsClient] = useState(false)
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const isAuthor = userId === problem.author_id

  const handleUpvote = async () => {
    if (!userId) {
      router.push("/auth/login")
      return
    }

    setIsUpvoting(true)
    const supabase = createClient()

    try {
      if (hasUpvoted) {
        const { error } = await supabase.from("upvotes").delete().eq("problem_id", problem.id).eq("user_id", userId)

        if (!error) {
          setUpvotes((prev) => prev - 1)
          setHasUpvoted(false)
        }
      } else {
        const { error } = await supabase.from("upvotes").insert({ problem_id: problem.id, user_id: userId })

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

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("problems").delete().eq("id", problem.id).eq("author_id", userId!)

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
    const text = `Take a look on ${problem.profiles?.username || "someone"}'s problem on StartOrigin.me - it's a platform, where you can publish problems you face and find co-founders to solve it.`
    const url = `${window.location.origin}/problems/${problem.id}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
  }

  const shareOnTelegram = () => {
    const text = `Take a look on ${problem.profiles?.username || "someone"}'s problem on StartOrigin.me - it's a platform, where you can publish problems you face and find co-founders to solve it.`
    const url = `${window.location.origin}/problems/${problem.id}`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(telegramUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Problem Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <Button
                variant={hasUpvoted ? "default" : "outline"}
                size="sm"
                className="flex-col gap-1 h-auto py-3 px-4"
                onClick={handleUpvote}
                disabled={isUpvoting}
              >
                <ArrowBigUp className="h-6 w-6" />
                <span className="text-sm font-semibold">{upvotes}</span>
              </Button>

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-3">{problem.title}</h1>
                  <div className="flex flex-wrap gap-2">
                    {problem.category && <Badge variant="secondary">{getCategoryLabel(problem.category)}</Badge>}
                    {problem.tags?.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    <Badge
                      variant={
                        problem.status === "open" ? "default" : problem.status === "solved" ? "secondary" : "outline"
                      }
                    >
                      {getStatusLabel(problem.status)}
                    </Badge>
                    {problem.looking_for_cofounder && (
                      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                        <Users className="h-4 w-4" />
                        Looking for Cofounder
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(problem.created_at)}</span>
                  </div>
                  
                  {/* Кнопка поделиться */}
                  <div className="relative">
                    <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
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

            {/* Кнопки действий - выровнены по правому краю */}
            {isAuthor && (
              <div className="flex gap-2">
                {/* Основные кнопки для десктопа */}
                <div className="hidden sm:flex gap-2">
                  <Link href={`/problems/${problem.id}/edit`}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this problem? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
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

                {/* Dropdown меню для мобильных */}
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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

                  {/* Скрытый триггер для диалога удаления */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button data-delete-trigger className="hidden" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this problem? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
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
        </CardHeader>

        <CardContent>
          <div className="prose prose-slate max-w-none">
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">{problem.description}</p>
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
              href={problem.profiles?.username ? `/user/${problem.profiles.username}` : "#"}
              className={problem.profiles?.username ? "cursor-pointer" : "cursor-default"}
            >
              <Avatar className="h-16 w-16">
                <AvatarImage src={problem.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {problem.profiles?.username ? (
                  <Link 
                    href={`/user/${problem.profiles.username}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {problem.profiles.display_name || problem.profiles.username}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground">
                    {problem.profiles?.display_name || "Anonymous"}
                  </h3>
                )}
              </div>
              
              {problem.profiles?.username && (
                <Link 
                  href={`/user/${problem.profiles.username}`}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  @{problem.profiles.username}
                </Link>
              )}
              
              {problem.profiles?.bio && (
                <p className="mt-2 text-sm text-muted-foreground">{problem.profiles.bio}</p>
              )}

              {problem.contact && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getContactIcon(problem.contact)}
                    <span className="font-mono">{problem.contact}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
