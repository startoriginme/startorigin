"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Shield, Lightbulb } from "lucide-react"
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

const ADMIN_PASSWORD = "RealAdminStartOriginModeration"

type Problem = {
  id: string
  title: string
  description: string
  category: string | null
  created_at: string
  author_id: string
  upvotes: number
  profiles: {
    username: string | null
    display_name: string | null
  } | null
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [problems, setProblems] = useState<Problem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadProblems()
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setError(null)
    } else {
      setError("Invalid password")
    }
  }

  const loadProblems = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from("problems")
        .select(
          `
          *,
          profiles (
            username,
            display_name
          )
        `,
        )
        .order("created_at", { ascending: false })

      if (error) throw error
      setProblems(data || [])
    } catch (err) {
      console.error("Error loading problems:", err)
      setError("Failed to load problems")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (problemId: string) => {
    setDeletingId(problemId)

    try {
      // Используем прямой запрос к Supabase вместо серверного действия
      const supabase = createClient()
      
      // Сначала удаляем связанные записи (upvotes)
      await supabase
        .from("upvotes")
        .delete()
        .eq("problem_id", problemId)

      // Затем удаляем саму проблему
      const { error } = await supabase
        .from("problems")
        .delete()
        .eq("id", problemId)

      if (error) throw error

      // Удаляем из локального состояния
      setProblems(problems.filter((p) => p.id !== problemId))
      
    } catch (err) {
      console.error("Error deleting problem:", err)
      alert("Failed to delete problem")
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">StartOrigin</span>
            </Link>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Admin Panel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Admin Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  {error && (
                    <div className="rounded-md bg-destructive/10 p-3">
                      <p className="text-sm text-destructive">{error}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                  <Link href="/">
                    <Button type="button" variant="outline" className="w-full bg-transparent">
                      Back to Home
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{problems.length} Problems</Badge>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading problems...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No problems found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem) => (
              <Card key={problem.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link href={`/problems/${problem.id}`} target="_blank">
                        <h3 className="text-lg font-semibold hover:text-primary transition-colors mb-2">
                          {problem.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{problem.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>By {problem.profiles?.display_name || problem.profiles?.username || "Anonymous"}</span>
                        <span>{formatDate(problem.created_at)}</span>
                        <span>{problem.upvotes} upvotes</span>
                        {problem.category && <Badge variant="outline">{problem.category}</Badge>}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2" disabled={deletingId === problem.id}>
                          <Trash2 className="h-4 w-4" />
                          {deletingId === problem.id ? "Deleting..." : "Delete"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{problem.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(problem.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
