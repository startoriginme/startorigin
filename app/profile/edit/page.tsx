"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Lightbulb, ArrowLeft, Loader2 } from "lucide-react"

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const router = useRouter()

  // Загружаем данные профиля при монтировании
  useState(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profile) {
        setDisplayName(profile.display_name || "")
        setUsername(profile.username || "")
        setBio(profile.bio || "")
      }
      
      setIsDataLoading(false)
    }

    fetchProfile()
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🔒 ЗАЩИТА ОТ МНОЖЕСТВЕННЫХ НАЖАТИЙ
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Валидация username
      if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Username can only contain letters, numbers, and underscores")
      }

      // Проверяем, не занят ли username другим пользователем
      if (username) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("username", username)
          .neq("id", user.id)
          .single()

        if (existingProfile) {
          throw new Error("This username is already taken. Please choose another one.")
        }
      }

      // Обновляем профиль
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          username: username || null,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("This username is already taken. Please choose another one.")
        }
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // 🚀 ОПТИМИСТИЧНЫЙ РЕДИРЕКТ
      router.push("/profile")
      router.refresh()

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false) // ❌ При ошибке снова разрешаем нажатия
    }
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Error Message Display */}
              {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is the name that will be displayed on your profile and posts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    pattern="[a-zA-Z0-9_]+"
                    title="Username can only contain letters, numbers, and underscores"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your unique username. Only letters, numbers, and underscores allowed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">A short bio about yourself (optional).</p>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Link href="/profile" className="flex-1">
                    <Button type="button" variant="outline" className="w-full bg-transparent" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
