"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trash2, 
  Shield, 
  Lightbulb, 
  UserPlus, 
  Users, 
  Search, 
  CheckCircle, 
  BadgeCheck,
  Sparkles
} from "lucide-react"
import { GiWhaleTail } from "react-icons/gi"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ADMIN_PASSWORD = "MaxNikolaevAdminStartOriginOfficialModeration"

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

type UserBadge = {
  id: string
  user_id: string
  badge_type: 'verified' | 'whale' | 'early'
  created_at: string
  created_by: string
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
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAliasId, setDeletingAliasId] = useState<string | null>(null)
  const [deletingBadgeId, setDeletingBadgeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("problems")
  const [newAlias, setNewAlias] = useState({ alias: "", username: "" })
  const [newBadge, setNewBadge] = useState({ username: "", badge_type: "verified" as 'verified' | 'whale' | 'early' })
  const [searchUsername, setSearchUsername] = useState("")
  const [searchBadgeUsername, setSearchBadgeUsername] = useState("")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [badgeUserProfile, setBadgeUserProfile] = useState<any>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadProblems()
      loadAliases()
      loadUserBadges()
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
      const response = await fetch('/api/admin?action=getProblems')
      if (!response.ok) throw new Error('Failed to load problems')
      const data = await response.json()
      setProblems(data)
    } catch (err) {
      console.error('Error loading problems:', err)
      setError('Failed to load problems')
    } finally {
      setIsLoading(false)
    }
  }

  const loadAliases = async () => {
    try {
      const response = await fetch('/api/admin?action=getAliases')
      if (!response.ok) throw new Error('Failed to load aliases')
      const data = await response.json()
      setAliases(data)
    } catch (err) {
      console.error('Error loading aliases:', err)
    }
  }

  const loadUserBadges = async () => {
    try {
      const response = await fetch('/api/admin?action=getUserBadges')
      if (!response.ok) throw new Error('Failed to load badges')
      const data = await response.json()
      setUserBadges(data)
    } catch (err) {
      console.error('Error loading badges:', err)
    }
  }

  const searchUser = async (searchForBadge = false) => {
    const username = searchForBadge ? searchBadgeUsername : searchUsername
    if (!username) return

    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'searchUser',
          data: { username }
        })
      })
      
      if (!response.ok) throw new Error('User not found')
      const data = await response.json()
      
      if (searchForBadge) {
        setBadgeUserProfile(data)
        setNewBadge(prev => ({ ...prev, username: data.username }))
      } else {
        setUserProfile(data)
        setNewAlias(prev => ({ ...prev, username: data.username }))
      }
    } catch (err) {
      console.error('Error searching user:', err)
      if (searchForBadge) {
        setBadgeUserProfile(null)
        alert('User not found. Please check the username.')
      } else {
        setUserProfile(null)
        alert('User not found. Please check the username.')
      }
    }
  }

  const handleDelete = async (problemId: string) => {
    setDeletingId(problemId)
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteProblem',
          data: { problemId }
        })
      })
      
      if (!response.ok) throw new Error('Failed to delete problem')
      setProblems(problems.filter((p) => p.id !== problemId))
    } catch (err) {
      console.error('Error deleting problem:', err)
      alert('Failed to delete problem')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newAlias.alias) {
      alert('Please fill in alias')
      return
    }

    try {
      let userId = ''

      if (userProfile) {
        userId = userProfile.id
      } else if (newAlias.username) {
        // Ищем пользователя по username
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'searchUser',
            data: { username: newAlias.username }
          })
        })
        
        if (!response.ok) throw new Error('User not found')
        const userData = await response.json()
        userId = userData.id
      } else {
        alert('Please either search for a user first or provide a username')
        return
      }

      // Добавляем алиас
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addAlias',
          data: { 
            alias: newAlias.alias,
            userId: userId
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add alias')
      }

      setNewAlias({ alias: '', username: '' })
      setUserProfile(null)
      setSearchUsername('')
      loadAliases()
      alert('Alias added successfully!')
      
    } catch (err: any) {
      console.error('Error adding alias:', err)
      alert(err.message || 'Failed to add alias')
    }
  }

  const handleAddBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      let userId = ''

      if (badgeUserProfile) {
        userId = badgeUserProfile.id
      } else if (newBadge.username) {
        // Ищем пользователя по username
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'searchUser',
            data: { username: newBadge.username }
          })
        })
        
        if (!response.ok) throw new Error('User not found')
        const userData = await response.json()
        userId = userData.id
      } else {
        alert('Please search for a user first or provide a username')
        return
      }

      // Добавляем значок
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addBadge',
          data: { 
            userId: userId,
            badge_type: newBadge.badge_type
          }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add badge')
      }

      setNewBadge({ username: "", badge_type: "verified" })
      setBadgeUserProfile(null)
      setSearchBadgeUsername('')
      loadUserBadges()
      alert('Badge added successfully!')
      
    } catch (err: any) {
      console.error('Error adding badge:', err)
      alert(err.message || 'Failed to add badge')
    }
  }

  const handleDeleteAlias = async (aliasId: string) => {
    setDeletingAliasId(aliasId)
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteAlias',
          data: { aliasId }
        })
      })
      
      if (!response.ok) throw new Error('Failed to delete alias')
      setAliases(aliases.filter((a) => a.id !== aliasId))
    } catch (err) {
      console.error('Error deleting alias:', err)
      alert('Failed to delete alias')
    } finally {
      setDeletingAliasId(null)
    }
  }

  const handleDeleteBadge = async (badgeId: string) => {
    setDeletingBadgeId(badgeId)
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteBadge',
          data: { badgeId }
        })
      })
      
      if (!response.ok) throw new Error('Failed to delete badge')
      setUserBadges(userBadges.filter((b) => b.id !== badgeId))
    } catch (err) {
      console.error('Error deleting badge:', err)
      alert('Failed to delete badge')
    } finally {
      setDeletingBadgeId(null)
    }
  }

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'verified':
        return <BadgeCheck className="h-4 w-4 text-blue-500" />
      case 'whale':
        return <GiWhaleTail className="h-4 w-4 text-purple-500" />
      case 'early':
        return <Sparkles className="h-4 w-4 text-yellow-500" />
      default:
        return <BadgeCheck className="h-4 w-4" />
    }
  }

  const getBadgeName = (badgeType: string) => {
    switch (badgeType) {
      case 'verified':
        return "Verified"
      case 'whale':
        return "Whale"
      case 'early':
        return "Early Supporter"
      default:
        return badgeType
    }
  }

  const getBadgeColor = (badgeType: string) => {
    switch (badgeType) {
      case 'verified':
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 'whale':
        return "bg-purple-100 text-purple-800 border-purple-200"
      case 'early':
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800"
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList>
                  <TabsTrigger value="problems">Problems ({problems.length})</TabsTrigger>
                  <TabsTrigger value="aliases">Aliases ({aliases.length})</TabsTrigger>
                  <TabsTrigger value="badges">Badges ({userBadges.length})</TabsTrigger>
                </TabsList>
              </Tabs>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="problems">
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
          </TabsContent>

          <TabsContent value="aliases">
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
                        <Button type="button" onClick={() => searchUser(false)} className="gap-2">
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
          </TabsContent>

          <TabsContent value="badges">
            <div className="space-y-6">
              {/* Add Badge Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <CardTitle>Add User Badge</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search User */}
                    <div className="space-y-2">
                      <Label htmlFor="searchBadgeUsername">Find User by Username</Label>
                      <div className="flex gap-2">
                        <Input
                          id="searchBadgeUsername"
                          placeholder="Enter username (without @)"
                          value={searchBadgeUsername}
                          onChange={(e) => setSearchBadgeUsername(e.target.value)}
                        />
                        <Button type="button" onClick={() => searchUser(true)} className="gap-2">
                          <Search className="h-4 w-4" />
                          Search
                        </Button>
                      </div>
                    </div>

                    {badgeUserProfile && (
                      <div className="p-4 border border-green-200 rounded-lg bg-green-50 mt-2">
                        <h4 className="font-semibold text-green-800">User Found:</h4>
                        <p className="text-green-700">Display Name: {badgeUserProfile.display_name || "Not set"}</p>
                        <p className="text-green-700">Username: {badgeUserProfile.username || "Not set"}</p>
                        <p className="text-sm text-green-600">ID: {badgeUserProfile.id}</p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setBadgeUserProfile(null)
                            setNewBadge(prev => ({ ...prev, username: "" }))
                          }}
                          className="mt-2"
                        >
                          Clear Search
                        </Button>
                      </div>
                    )}

                    <form onSubmit={handleAddBadge}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="badgeUsername">
                            Username {!badgeUserProfile && "*"}
                            {badgeUserProfile && <span className="text-green-600 ml-1">✓ Found via search</span>}
                          </Label>
                          <Input
                            id="badgeUsername"
                            placeholder={badgeUserProfile ? badgeUserProfile.username : "Enter username"}
                            value={badgeUserProfile ? badgeUserProfile.username : newBadge.username}
                            onChange={(e) => setNewBadge({ ...newBadge, username: e.target.value })}
                            required={!badgeUserProfile}
                            disabled={!!badgeUserProfile}
                            className={badgeUserProfile ? "bg-green-50 border-green-200" : ""}
                          />
                        </div>
                        <div>
                          <Label htmlFor="badgeType">Badge Type *</Label>
                          <Select 
                            value={newBadge.badge_type} 
                            onValueChange={(value: 'verified' | 'whale' | 'early') => setNewBadge({ ...newBadge, badge_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select badge type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="verified">
                                <div className="flex items-center gap-2">
                                  <BadgeCheck className="h-4 w-4 text-blue-500" />
                                  <span>Verified</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="whale">
                                <div className="flex items-center gap-2">
                                  <GiWhaleTail className="h-4 w-4 text-purple-500" />
                                  <span>Whale</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="early">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-yellow-500" />
                                  <span>Early Supporter</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="gap-2 mt-4">
                        <BadgeCheck className="h-4 w-4" />
                        Add Badge
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>

              {/* Badges List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                    <CardTitle>User Badges ({userBadges.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {userBadges.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No badges found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userBadges.map((badge) => (
                        <div key={badge.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${getBadgeColor(badge.badge_type)}`}>
                              {getBadgeIcon(badge.badge_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{getBadgeName(badge.badge_type)}</span>
                                <Badge variant="outline" className={getBadgeColor(badge.badge_type)}>
                                  {badge.badge_type}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                User: {badge.profiles?.display_name || badge.profiles?.username || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                User ID: {badge.user_id}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Added: {formatDate(badge.created_at)}
                              </div>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="gap-2" disabled={deletingBadgeId === badge.id}>
                                <Trash2 className="h-4 w-4" />
                                {deletingBadgeId === badge.id ? "Deleting..." : "Delete"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Badge</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the "{getBadgeName(badge.badge_type)}" badge from this user? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteBadge(badge.id)}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
