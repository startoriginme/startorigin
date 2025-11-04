"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users } from "lucide-react"
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
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
    bio: string | null
  } | null
}

type ProblemDetailProps = {
  problem: Problem
  userId?: string
  initialHasUpvoted: boolean
}

export function ProblemDetail({ problem, userId, initialHasUpvoted }: ProblemDetailProps) {
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

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
          <div className="flex items-start gap-4">
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
              </div>
            </div>

            {isAuthor && (
              <div className="flex gap-2">
                <Link href={`/problems/${problem.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Edit className="h-4 w-4" />
                    
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Trash2 className="h-4 w-4" />
                      
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
            <Avatar className="h-16 w-16">
              <AvatarImage src={problem.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {problem.profiles?.display_name || problem.profiles?.username || "Anonymous"}
              </h3>
              {problem.profiles?.username && (
                <p className="text-sm text-muted-foreground">@{problem.profiles.username}</p>
              )}
              {problem.profiles?.bio && <p className="mt-2 text-sm text-muted-foreground">{problem.profiles.bio}</p>}

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
