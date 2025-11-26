"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { supabaseAdmin } from "@/lib/supabase/admin-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Shield, Lightbulb, UserPlus, Users, Search } from "lucide-react"
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
    id: string
    username: string | null
    display_name: string | null
  } | null
}

type UserAlias = {
  id: string
  alias: string
  user_id: string
  created_at: string
  profiles: {
    username: string | null
    display_name: string | null
  } | null
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [problems, setProblems] = useState<Problem[]>([])
  const [aliases, setAliases] = useState<UserAlias[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAliasId, setDeletingAliasId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"problems" | "aliases">("problems")
  const [newAlias, setNewAlias] = useState({ alias: "", username: "" })
  const [searchUsername, setSearchUsername] = useState("")
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadProblems()
      loadAliases()
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
    
    try {
      // Используем admin client для доступа ко всем данным
      const { data, error } = await supabaseAdmin
        .from("problems")
        .select(
          `
          *,
          profiles (
            id,
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

  const loadAliases = async () => {
    try {
      // Используем admin client для доступа ко всем алиасам
      const { data, error } = await supabaseAdmin
        .from("user_aliases")
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
      setAliases(data || [])
    } catch (err) {
      console.error("Error loading aliases:", err)
    }
  }

  const searchUser = async () => {
    if (!searchUsername) return

    try {
      // Используем admin client для поиска пользователей
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("username", searchUsername.toLowerCase())
        .single()

      if (error) throw error
      setUserProfile(data)
      // Автоматически заполняем поле username в форме
      setNewAlias(prev => ({ ...prev, username: data.username }))
    } catch (err) {
      console.error("Error searching user:", err)
      setUserProfile(null)
      alert("User not found. Please check the username.")
    }
  }

  const handleDelete = async (problemId: string) => {
    setDeletingId(problemId)

    try {
      // Удаляем через admin client (имеет права на удаление любых данных)
      await supabaseAdmin
        .from("upvotes")
        .delete()
        .eq("problem_id", problemId)

      const { error } = await supabaseAdmin
        .from("problems")
        .delete()
        .eq("id", problemId)

      if (error) throw error

      setProblems(problems.filter((p) => p.id !== problemId))
      
    } catch (err) {
      console.error("Error deleting problem:", err)
      alert("Failed to delete problem")
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAlias.alias) {
      alert("Please fill in alias")
      return
    }

    try {
      let userId = ""

      // Если пользователь найден через поиск, используем его ID
      if (userProfile) {
        userId = userProfile.id
      } 
      // Иначе пытаемся найти пользователя по username из формы
      else if (newAlias.username) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("username", newAlias.username.toLowerCase())
          .single()

        if (userError || !userData) {
          alert("User not found. Please check the username or use the search function.")
          return
        }
        userId = userData.id
      } 
      // Если ни одного способа нет
      else {
        alert("Please either search for a user first or provide a username")
        return
      }

      // Проверяем, не существует ли уже такой алиас
      const { data: existingAlias, error: checkError } = await supabaseAdmin
        .from("user_aliases")
        .select("id")
        .eq("alias", newAlias.alias.toLowerCase())
        .single()

      if (!checkError && existingAlias) {
        alert("This alias already exists. Please choose a different one.")
        return
      }

      // Проверяем, не является ли алиас чьим-то основным username
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("username", newAlias.alias.toLowerCase())
        .single()

      if (!userCheckError && existingUser) {
        alert("This alias matches an existing username. Please choose a different one.")
        return
      }

      // Добавляем алиас через admin client
      const { error } = await supabaseAdmin
        .from("user_aliases")
        .insert({
          alias: newAlias.alias.toLowerCase(),
          user_id: userId
        })

      if (error) {
        if (error.code === '23505') { // Unique violation
          alert("This alias already exists. Please choose a different one.")
          return
        }
        throw error
      }

      setNewAlias({ alias: "", username: "" })
      setUserProfile(null)
      setSearchUsername("")
      loadAliases()
      alert("Alias added successfully!")
      
    } catch (err) {
      console.error("Error adding alias:", err)
      alert("Failed to add alias. It might already exist.")
    }
  }

  const handleDeleteAlias = async (aliasId: string) => {
    setDeletingAliasId(aliasId)

    try {
      // Удаляем алиас через admin client
      const { error } = await supabaseAdmin
        .from("user_aliases")
        .delete()
        .eq("id", aliasId)

      if (error) throw error

      setAliases(aliases.filter((a) => a.id !== aliasId))
      
    } catch (err) {
      console.error("Error deleting alias:", err)
      alert("Failed to delete alias")
    } finally {
      setDeletingAliasId(null)
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
              <div className="flex gap-2">
                <Button 
                  variant={activeTab === "problems" ? "default" : "outline"} 
                  onClick={() => setActiveTab("problems")}
                >
                  Problems ({problems.length})
                </Button>
                <Button 
                  variant={activeTab === "aliases" ? "default" : "outline"} 
                  onClick={() => setActiveTab("aliases")}
                >
                  Aliases ({aliases.length})
                </Button>
              </div>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeTab === "problems" ? (
          <>
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
          </>
        ) : (
          <div className="space-y-6">
            {/* Add Alias Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <CardTitle>Add New Alias</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search User */}
                  <div className="space-y-2">
                    <Label htmlFor="searchUsername">Find User by Username</Label>
                    <div className="flex gap-2">
                      <Input
                        id="searchUsername"
                        placeholder="Enter username (without @)"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                      />
                      <Button type="button" onClick={searchUser} className="gap-2">
                        <Search className="h-4 w-4" />
                        Search
                      </Button>
                    </div>
                  </div>

                  {userProfile && (
                    <div className="p-4 border border-green-200 rounded-lg bg-green-50 mt-2">
                      <h4 className="font-semibold text-green-800">User Found:</h4>
                      <p className="text-green-700">Display Name: {userProfile.display_name || "Not set"}</p>
                      <p className="text-green-700">Username: {userProfile.username || "Not set"}</p>
                      <p className="text-sm text-green-600">ID: {userProfile.id}</p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setUserProfile(null)
                          setNewAlias({ ...newAlias, username: "" })
                        }}
                        className="mt-2"
                      >
                        Clear Search
                      </Button>
                    </div>
                  )}

                  <form onSubmit={handleAddAlias}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="alias">New Alias *</Label>
                        <Input
                          id="alias"
                          placeholder="Enter new alias (without @)"
                          value={newAlias.alias}
                          onChange={(e) => setNewAlias({ ...newAlias, alias: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="username">
                          Main Username {!userProfile && "*"}
                          {userProfile && <span className="text-green-600 ml-1">✓ Found via search</span>}
                        </Label>
                        <Input
                          id="username"
                          placeholder={userProfile ? userProfile.username : "Enter main username"}
                          value={userProfile ? userProfile.username : newAlias.username}
                          onChange={(e) => setNewAlias({ ...newAlias, username: e.target.value })}
                          required={!userProfile}
                          disabled={!!userProfile}
                          className={userProfile ? "bg-green-50 border-green-200" : ""}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="gap-2 mt-4">
                      <UserPlus className="h-4 w-4" />
                      Add Alias
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            {/* Aliases List */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>User Aliases ({aliases.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {aliases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No aliases found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aliases.map((alias) => (
                      <div key={alias.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">@{alias.alias}</span>
                            <Badge variant="secondary">Alias</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Main account: {alias.profiles?.display_name || alias.profiles?.username || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            User ID: {alias.user_id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Added: {formatDate(alias.created_at)}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-2" disabled={deletingAliasId === alias.id}>
                              <Trash2 className="h-4 w-4" />
                              {deletingAliasId === alias.id ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Alias</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete alias "@{alias.alias}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAlias(alias.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
