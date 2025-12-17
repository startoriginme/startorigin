"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, User, ArrowLeft, Share2, Download, LogIn, ShoppingBasket, MessageSquareMore, Upload, ImageIcon, Globe, MessageCircle, X, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function EditProfilePage() {
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [website, setWebsite] = useState("")
  const [disableChat, setDisableChat] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const router = useRouter()

  // Загружаем данные профиля при монтировании
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/auth/login")
        return
      }

      setUser(authUser)

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        setDisplayName(profile.display_name || "")
        setUsername(profile.username || "")
        setBio(profile.bio || "")
        setAvatarUrl(profile.avatar_url || "")
        setWebsite(profile.website || "")
        setDisableChat(profile.disable_chat || false)
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

      // Создаем безопасное имя файла
      const safeFileName = createSafeFileName(file)
      const filePath = `${user.id}/${safeFileName}`
      
      console.log("Uploading file:", filePath)
      
      // Загружаем файл в Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        
        // Если файл уже существует, пробуем с другим именем
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

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log("Upload successful, URL:", publicUrl)
      
      // Добавляем параметр для избежания кэширования
      const uniqueUrl = `${publicUrl}?t=${Date.now()}`
      setAvatarUrl(uniqueUrl)
      
    } catch (error: any) {
      console.error("Upload failed:", error)
      setError(`Failed to upload avatar: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Валидация имени файла
    const fileName = file.name
    if (/[^a-zA-Z0-9._-]/.test(fileName)) {
      setError("File name contains invalid characters. Please rename the file to use only English letters, numbers, and basic symbols.")
      return
    }

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

    // Валидация имени файла
    const fileName = file.name
    if (/[^a-zA-Z0-9._-]/.test(fileName)) {
      setError("File name contains invalid characters. Please rename the file to use only English letters, numbers, and basic symbols.")
      return
    }

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
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && avatarUrl.includes('avatars')) {
          // Извлекаем имя файла из URL
          const urlParts = avatarUrl.split('/')
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
    setCustomAvatarUrl("")
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

  // Функция для применения кастомного URL
  const applyCustomAvatarUrl = () => {
    if (customAvatarUrl.trim()) {
      setAvatarUrl(customAvatarUrl.trim())
      setCustomAvatarUrl("")
    }
  }

  const validateWebsite = (url: string) => {
    if (!url) return true // Пустая строка допустима
    try {
      // Добавляем https:// если нет протокола
      let normalizedUrl = url
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        normalizedUrl = 'https://' + url
      }
      new URL(normalizedUrl)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLoading) return
    
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const normalizedUsername = username ? username.toLowerCase().trim() : ""
      const normalizedWebsite = website ? website.trim() : ""

      // Валидация website
      if (normalizedWebsite && !validateWebsite(normalizedWebsite)) {
        throw new Error("Please enter a valid website URL (e.g., example.com or https://example.com)")
      }

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

      // Если avatarUrl - это Data URL, находим соответствующий загруженный файл
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

      // Подготавливаем website для сохранения
      let finalWebsite = normalizedWebsite
      if (finalWebsite && !finalWebsite.startsWith('http')) {
        finalWebsite = 'https://' + finalWebsite
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || null,
          username: normalizedUsername || null,
          bio: bio || null,
          avatar_url: finalAvatarUrl || null,
          website: finalWebsite || null,
          disable_chat: disableChat,
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

   return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card relative">
        <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden z-0">
          <div className="flex justify-center">
            <div className="relative h-4 flex">
              <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-gray-400/30"></div>
              
              {[...Array(15)].map((_, i) => (
                <div 
                  key={i}
                  className="relative mx-1"
                  style={{
                    animationDelay: `${i * 0.15}s`
                  }}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    i % 3 === 0 ? 'bg-red-500 animate-pulse' :
                    i % 3 === 1 ? 'bg-green-500 animate-pulse' :
                    'bg-yellow-500 animate-pulse'
                  }`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/70 blur-sm ${
                    i % 3 === 0 ? 'animate-pulse' :
                    i % 3 === 1 ? 'animate-pulse delay-75' :
                    'animate-pulse delay-150'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-4 relative z-10">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 relative hover:opacity-90 transition-opacity">
              <span className="text-2xl font-black uppercase tracking-tighter font-montserrat text-foreground">
                STARTORIGIN
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-3">
              {/* Кнопка Marketplace */}
              <Link href="https://startorigin.me/marketplace" target="_blank">
                <Button variant="outline" className="gap-2">
                  <ShoppingBasket className="h-4 w-4" />
                  Marketplace
                </Button>
              </Link>

              {/* Кнопка Chat - просто ссылка */}
              <Link href="https://startorigin.me/user/chat">
                <Button variant="outline" className="gap-2">
                  <MessageSquareMore className="h-4 w-4" />
                  Chat
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Share Problem
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={userProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(userProfile?.display_name || userProfile?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form onSubmit={async (e) => {
                          e.preventDefault()
                          await handleLogout()
                        }} className="w-full">
                          <button type="submit" className="flex items-center gap-2 w-full text-left cursor-pointer">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                // Только одна кнопка Login с иконкой на десктопе
                <Link href="/auth/login">
                  <Button size="icon" variant="outline" className="h-10 w-10">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2 md:hidden">
              {/* Мобильная версия кнопок */}
              <Link href="https://startorigin.me/marketplace" target="_blank">
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <ShoppingBasket className="h-4 w-4" />
                </Button>
              </Link>

              {/* Мобильная версия Chat - просто ссылка */}
              <Link href="https://startorigin.me/user/chat">
                <Button size="icon" variant="outline" className="h-9 w-9">
                  <MessageSquareMore className="h-4 w-4" />
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button size="icon" className="h-9 w-9">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage 
                            src={userProfile?.avatar_url || ""} 
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                            {getInitials(userProfile?.display_name || userProfile?.username)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <form onSubmit={async (e) => {
                          e.preventDefault()
                          await handleLogout()
                        }} className="w-full">
                          <button type="submit" className="flex items-center gap-2 w-full text-left cursor-pointer">
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </form>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                // Только одна кнопка Login с иконкой на мобиле
                <Link href="/auth/login">
                  <Button size="icon" variant="outline" className="h-9 w-9">
                    <LogIn className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mx-auto max-w-2xl">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/profile">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Profile</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>

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
                        {/* Кастомный аватар с правильным отображением */}
                        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted">
                          <img
                            src={avatarUrl}
                            alt="Profile avatar"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          {!avatarUrl && (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <span className="text-lg font-semibold text-muted-foreground">
                                {getInitials(displayName || username || "U")}
                              </span>
                            </div>
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
                              PNG, JPG, GIF up to 10MB
                            </p>
                            <p className="text-xs text-blue-500">
                              Image will be cropped to circle without distortion
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
                              onClick={() => setAvatarUrl(preset)}
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
                            variant="outline"
                            onClick={applyCustomAvatarUrl}
                            disabled={!customAvatarUrl.trim()}
                          >
                            Apply
                          </Button>
                        </div>
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
                  <Label htmlFor="website">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Website</span>
                    </div>
                  </Label>
                  <Input
                    id="website"
                    name="website"
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="example.com or https://example.com"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Link to your personal website, blog, or portfolio. Will be displayed as a button on your profile.
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

                {/* Privacy Settings */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <Label htmlFor="disable_chat" className="font-medium">
                          Don't allow users to chat with me
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        When enabled, you won't appear in chat search and the "Start Chat" button will be hidden on your profile.
                      </p>
                    </div>
                    <Switch
                      id="disable_chat"
                      checked={disableChat}
                      onCheckedChange={setDisableChat}
                      disabled={isLoading}
                    />
                  </div>
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

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground text-sm">
            © 2025 StartOrigin. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
