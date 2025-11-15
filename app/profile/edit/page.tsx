"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Lightbulb, ArrowLeft, Loader2, Upload, X, Image as ImageIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  // Загружаем данные профиля при монтировании
  useEffect(() => {
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
        setAvatarUrl(profile.avatar_url || "")
      }
      
      setIsDataLoading(false)
    }

    fetchProfile()
  }, [router])

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file")
      return
    }

    // Увеличиваем лимит размера файла для лучшего качества
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("Image size should be less than 10MB")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("User not authenticated")

      // Сохраняем оригинальное расширение файла
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      // Используем оригинальное имя файла + timestamp для уникальности
      const originalName = file.name.replace(/\.[^/.]+$/, "") // убираем расширение
      const fileName = `${user.id}/${timestamp}-${originalName}.${fileExt}`
      
      // Загружаем файл БЕЗ сжатия
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false, // не перезаписывать существующие
          // Отключаем любую обработку изображений
          contentType: file.type
        })

      if (uploadError) {
        // Если ошибка из-за дубликата, пробуем с другим именем
        if (uploadError.message?.includes('already exists')) {
          const uniqueFileName = `${user.id}/${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const { error: retryError } = await supabase.storage
            .from('avatars')
            .upload(uniqueFileName, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            })
          if (retryError) throw retryError
        } else {
          throw uploadError
        }
      }

      // Получаем публичный URL БЕЗ параметров трансформации
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Добавляем параметр, чтобы избежать кэширования старой версии
      const uniqueUrl = `${publicUrl}?t=${timestamp}`
      
      setAvatarUrl(uniqueUrl)
      
    } catch (error: any) {
      console.error("Upload error:", error)
      setError(`Failed to upload avatar: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // Альтернативный метод: создание Data URL для немедленного предпросмотра
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Сначала показываем превью через Data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setAvatarUrl(dataUrl)
    }
    reader.readAsDataURL(file)

    // Затем загружаем на сервер
    handleAvatarUpload(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    // Превью через Data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setAvatarUrl(dataUrl)
    }
    reader.readAsDataURL(file)

    // Загрузка на сервер
    handleAvatarUpload(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const removeAvatar = async () => {
    if (avatarUrl && avatarUrl.startsWith('http')) {
      // Если это URL из Supabase, можно попробовать удалить файл
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Извлекаем имя файла из URL
          const urlParts = avatarUrl.split('/')
          const fileName = urlParts[urlParts.length - 1].split('?')[0]
          if (fileName) {
            await supabase.storage
              .from('avatars')
              .remove([`${user.id}/${fileName}`])
          }
        }
      } catch (error) {
        console.error("Error removing avatar from storage:", error)
      }
    }
    setAvatarUrl("")
  }

  const getInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const normalizedUsername = username ? username.toLowerCase().trim() : ""

      if (normalizedUsername && !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
        throw new Error("Username can only contain letters, numbers, and underscores")
      }

      if (normalizedUsername) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, username")
          .eq("username", normalizedUsername)
          .neq("id", user.id)
          .single()

        if (existingProfile) {
          throw new Error("This username is already taken. Please choose another one.")
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Если avatarUrl - это Data URL, преобразуем его обратно в обычный URL
      let finalAvatarUrl = avatarUrl
      if (avatarUrl.startsWith('data:')) {
        // Находим последний загруженный файл пользователя
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(user.id, {
            sortBy: { column: 'created_at', order: 'desc' }
          })

        if (files && files.length > 0) {
          const latestFile = files[0]
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(`${user.id}/${latestFile.name}`)
          finalAvatarUrl = publicUrl
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          username: normalizedUsername || null,
          bio: bio || null,
          avatar_url: finalAvatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("This username is already taken. Please choose another one.")
        }
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      router.push("/profile")
      router.refresh()

    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
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
              {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload Section */}
                <div className="space-y-4">
                  <Label>Profile Picture</Label>
                  
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {/* Current Avatar Preview */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border-2 border-border">
                          <AvatarImage 
                            src={avatarUrl} 
                            className="object-cover" // Сохраняем пропорции
                          />
                          <AvatarFallback className="text-lg bg-muted">
                            {getInitials(displayName || username || "U")}
                          </AvatarFallback>
                        </Avatar>
                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={removeAvatar}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        {isUploading ? "Uploading..." : "Current avatar"}
                      </p>
                    </div>

                    {/* Upload Area */}
                    <div className="flex-1">
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                        
                        <div className="space-y-3">
                          <div className="flex justify-center">
                            <div className="p-3 bg-primary/10 rounded-full">
                              {isUploading ? (
                                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                              ) : (
                                <Upload className="h-6 w-6 text-primary" />
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              PNG, JPG, GIF up to 10MB (original quality)
                            </p>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            className="gap-2"
                          >
                            <ImageIcon className="h-4 w-4" />
                            Choose Image
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {/* Пресеты аватарок */}
                        {[
                          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
                          "https://images.unsplash.com/photo-1494790108755-2616b612b786", 
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
                        ].map((preset, index) => (
                          <button
                            key={index}
                            type="button"
                            className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                            onClick={() => setAvatarUrl(preset)}
                          >
                            <img
                              src={preset}
                              alt={`Avatar preset ${index + 1}`}
                              className="w-full h-16 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs">Use</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

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
                    <span className="text-blue-500"> Usernames are case-insensitive.</span>
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
                  <Button type="submit" disabled={isLoading || isUploading} className="flex-1">
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
