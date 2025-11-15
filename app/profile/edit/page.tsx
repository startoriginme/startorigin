"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { Lightbulb, ArrowLeft, Loader2, Upload, X, Image as ImageIcon, Move, ZoomIn, ZoomOut } from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [storedAvatarUrl, setStoredAvatarUrl] = useState("") // URL из базы данных
  const [customAvatarUrl, setCustomAvatarUrl] = useState("") // Пользовательский URL
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 50 }) // Позиция в %
  const [avatarScale, setAvatarScale] = useState(100) // Масштаб в %
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const avatarContainerRef = useRef<HTMLDivElement>(null)
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
        setStoredAvatarUrl(profile.avatar_url || "")
        setAvatarUrl(profile.avatar_url || "")
      }
      
      setIsDataLoading(false)
    }

    fetchProfile()
  }, [router])

  // Функция для создания безопасного имени файла
  const createSafeFileName = (file: File) => {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    
    const safeName = `avatar-${timestamp}-${randomString}.${fileExt}`
    
    return safeName
  }

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size should be less than 10MB")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("User not authenticated")

      const safeFileName = createSafeFileName(file)
      const filePath = `${user.id}/${safeFileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        if (uploadError.message?.includes('already exists')) {
          const newSafeFileName = createSafeFileName(file)
          const newFilePath = `${user.id}/${newSafeFileName}`
          
          const { error: retryError } = await supabase.storage
            .from('avatars')
            .upload(newFilePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            })
          
          if (retryError) throw retryError
        } else {
          throw uploadError
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const uniqueUrl = `${publicUrl}?t=${Date.now()}`
      setAvatarUrl(uniqueUrl)
      setStoredAvatarUrl(uniqueUrl)
      setIsEditingAvatar(true)
      
    } catch (error: any) {
      setError(`Failed to upload avatar: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name
    if (/[^a-zA-Z0-9._-]/.test(fileName)) {
      setError("File name contains invalid characters. Please rename the file to use only English letters, numbers, and basic symbols.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setAvatarUrl(dataUrl)
      setIsEditingAvatar(true)
    }
    reader.readAsDataURL(file)

    handleAvatarUpload(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return

    const fileName = file.name
    if (/[^a-zA-Z0-9._-]/.test(fileName)) {
      setError("File name contains invalid characters. Please rename the file to use only English letters, numbers, and basic symbols.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setAvatarUrl(dataUrl)
      setIsEditingAvatar(true)
    }
    reader.readAsDataURL(file)

    handleAvatarUpload(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // Начало перетаскивания
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditingAvatar) return
    
    e.preventDefault() // Предотвращаем стандартное поведение
    setIsDragging(true)
    handleAvatarDrag(e)
    
    // Добавляем обработчики для всего документа
    document.addEventListener('mousemove', handleDocumentDrag)
    document.addEventListener('mouseup', handleDragEnd)
  }

  // Перетаскивание по документу
  const handleDocumentDrag = (e: MouseEvent) => {
    if (!isDragging || !avatarContainerRef.current) return

    e.preventDefault() // Предотвращаем стандартное поведение
    
    const container = avatarContainerRef.current
    const rect = container.getBoundingClientRect()
    
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setAvatarPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    })
  }

  // Обработка перетаскивания (для клика)
  const handleAvatarDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditingAvatar || !avatarContainerRef.current) return

    e.preventDefault() // Предотвращаем стандартное поведение
    
    const container = avatarContainerRef.current
    const rect = container.getBoundingClientRect()
    
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setAvatarPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    })
  }

  // Конец перетаскивания
  const handleDragEnd = (e?: Event) => {
    if (e) {
      e.preventDefault() // Предотвращаем стандартное поведение
    }
    setIsDragging(false)
    document.removeEventListener('mousemove', handleDocumentDrag)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  // Предотвращаем контекстное меню при перетаскивании
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      e.preventDefault()
    }
  }

  const removeAvatar = async () => {
    if (storedAvatarUrl && storedAvatarUrl.startsWith('http')) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && storedAvatarUrl.includes('avatars')) {
          const urlParts = storedAvatarUrl.split('/')
          const fileNameWithParams = urlParts[urlParts.length - 1]
          const fileName = fileNameWithParams.split('?')[0]
          
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
    setStoredAvatarUrl("")
    setCustomAvatarUrl("")
    setIsEditingAvatar(false)
  }

  const applyCustomUrl = () => {
    if (customAvatarUrl.trim()) {
      setAvatarUrl(customAvatarUrl)
      setIsEditingAvatar(true)
    }
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

      let finalAvatarUrl = avatarUrl

      if (avatarUrl.startsWith('data:')) {
        const { data: files } = await supabase.storage
          .from('avatars')
          .list(user.id, {
            sortBy: { column: 'created_at', order: 'desc' },
            limit: 1
          })

        if (files && files.length > 0) {
          const latestFile = files[0]
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(`${user.id}/${latestFile.name}`)
          finalAvatarUrl = `${publicUrl}?t=${Date.now()}`
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
                        {/* Редактируемый аватар */}
                        <div 
                          ref={avatarContainerRef}
                          className={`h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted relative ${
                            isEditingAvatar && avatarUrl ? 'cursor-grab active:cursor-grabbing' : ''
                          }`}
                          onMouseDown={handleDragStart}
                          onContextMenu={handleContextMenu}
                          style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                        >
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Profile avatar"
                              className="w-full h-full object-cover select-none"
                              style={{
                                objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                                transform: `scale(${avatarScale / 100})`,
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                MozUserSelect: 'none',
                                msUserSelect: 'none',
                                WebkitUserDrag: 'none',
                                userDrag: 'none'
                              }}
                              draggable="false"
                              onDragStart={(e) => e.preventDefault()}
                              onMouseDown={(e) => e.preventDefault()}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <span className="text-lg font-semibold text-muted-foreground">
                                {getInitials(displayName || username || "U")}
                              </span>
                            </div>
                          )}
                          
                          {/* Overlay для редактирования */}
                          {isEditingAvatar && avatarUrl && (
                            <>
                              <div className="absolute inset-0 border-2 border-primary border-dashed rounded-full pointer-events-none" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                                <Move className="h-6 w-6 text-white" />
                              </div>
                            </>
                          )}
                        </div>
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
                      
                      {/* Controls for avatar editing */}
                      {isEditingAvatar && avatarUrl && (
                        <div className="space-y-2 w-full">
                          <div className="flex items-center gap-2">
                            <Move className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {isDragging ? "Dragging..." : "Click and drag to reposition"}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Zoom</span>
                              <span className="text-xs font-medium">{avatarScale}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setAvatarScale(Math.max(50, avatarScale - 10))}
                              >
                                <ZoomOut className="h-3 w-3" />
                              </Button>
                              <Slider
                                value={[avatarScale]}
                                onValueChange={([value]) => setAvatarScale(value)}
                                min={50}
                                max={200}
                                step={10}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setAvatarScale(Math.min(200, avatarScale + 10))}
                              >
                                <ZoomIn className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAvatarPosition({ x: 50, y: 50 })
                                setAvatarScale(100)
                              }}
                            >
                              Reset
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsEditingAvatar(false)}
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {!isEditingAvatar && avatarUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingAvatar(true)}
                          className="gap-2"
                        >
                          <Move className="h-3 w-3" />
                          Adjust Avatar
                        </Button>
                      )}
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
                              PNG, JPG, GIF up to 10MB
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
                      
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Quick presets:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=center",
                            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=center", 
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=center"
                          ].map((preset, index) => (
                            <button
                              key={index}
                              type="button"
                              className="relative group rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                              onClick={() => {
                                setAvatarUrl(preset)
                                setIsEditingAvatar(true)
                              }}
                            >
                              <div className="w-full h-16 overflow-hidden">
                                <img
                                  src={preset}
                                  alt={`Avatar preset ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs">Use</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom URL Input */}
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Or paste image URL:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://example.com/avatar.jpg"
                            value={customAvatarUrl}
                            onChange={(e) => setCustomAvatarUrl(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            type="button" 
                            onClick={applyCustomUrl}
                            disabled={!customAvatarUrl.trim()}
                          >
                            Apply
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter any image URL from the web
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Остальные поля формы */}
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
