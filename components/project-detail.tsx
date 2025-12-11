"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GiWhaleTail } from "react-icons/gi"
import { 
  Calendar, 
  Users, 
  Edit, 
  Trash2, 
  Share2, 
  Copy, 
  Twitter, 
  MessageCircle, 
  Flag, 
  Shield, 
  Check, 
  ExternalLink, 
  Globe,
  Briefcase,
  Building,
  Target,
  Rocket,
  Eye,
  MapPin
} from "lucide-react"
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
import { useToast } from "@/components/ui/use-toast"

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  disable_chat: boolean | null
}

type Project = {
  id: string
  title: string
  short_description: string
  detailed_description: string
  category: string | null
  tags: string[] | null
  logo_url: string | null
  looking_for_cofounder: boolean | null
  status: string
  created_at: string
  author_id: string
  profiles: Profile | null
}

type ProjectDetailProps = {
  project: Project
  userId?: string
  allUsernames: string[]
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

// Функция для получения значков пользователя
async function getUserBadges(userId: string): Promise<Array<{badge_type: 'verified' | 'whale' | 'early'}>> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_type")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching user badges:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Error fetching user badges:", err)
    return []
  }
}

// Функция для объединения статических и базы данных алиасов
async function getAllUsernamesCombined(mainUsername: string, userId?: string): Promise<string[]> {
  const staticAliases = [mainUsername, ...(userAliases[mainUsername] || [])]
  
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

export function ProjectDetail({ 
  project, 
  userId, 
  allUsernames
}: ProjectDetailProps) {
  const [isClient, setIsClient] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [authorAllUsernames, setAuthorAllUsernames] = useState<string[]>(allUsernames)
  const [authorBadges, setAuthorBadges] = useState<Array<{badge_type: 'verified' | 'whale' | 'early'}>>([])
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const fetchAuthorData = async () => {
      if (project.author_id) {
        // Получаем значки автора
        const badges = await getUserBadges(project.author_id)
        setAuthorBadges(badges)
      }
      
      if (project.profiles?.username && project.author_id) {
        const usernames = await getAllUsernamesCombined(
          project.profiles.username, 
          project.author_id
        )
        setAuthorAllUsernames(usernames)
      } else if (project.profiles?.username) {
        const staticAliases = [project.profiles.username, ...(userAliases[project.profiles.username] || [])]
        setAuthorAllUsernames(staticAliases)
      }
    }
    
    fetchAuthorData()
  }, [project.profiles?.username, project.author_id])

  const isAuthor = userId === project.author_id

  // Получаем основной username автора
  const authorMainUsername = project.profiles?.username ? getMainUsername(project.profiles.username) : null

  // Проверяем наличие значков
  const hasVerifiedBadge = authorBadges.some(b => b.badge_type === 'verified')
  const hasWhaleBadge = authorBadges.some(b => b.badge_type === 'whale')
  const hasEarlyBadge = authorBadges.some(b => b.badge_type === 'early')

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.from("projects").delete().eq("id", project.id).eq("author_id", userId!)

      if (!error) {
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting project:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyToClipboard = async () => {
    const url = `${window.location.origin}/projects/${project.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied!",
        description: "Project link has been copied to clipboard",
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
    const text = `Check out this project "${project.title}" by ${project.profiles?.username || "someone"} on StartOrigin.me - a platform for sharing startup projects and finding co-founders.`
    const url = `${window.location.origin}/projects/${project.id}`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
  }

  const shareOnTelegram = () => {
    const text = `Check out this project "${project.title}" by ${project.profiles?.username || "someone"} on StartOrigin.me - a platform for sharing startup projects and finding co-founders.`
    const url = `${window.location.origin}/projects/${project.id}`
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(telegramUrl, '_blank', 'width=550,height=420')
    setIsShareOpen(false)
  }

  const handleReport = () => {
    const googleFormUrl = "https://forms.gle/RPUEPZBQEJHZT4GFA"
    
    const prefillUrl = `${googleFormUrl}?entry.123456789=${encodeURIComponent(project.title)}&entry.987654321=${encodeURIComponent(window.location.href)}`
    
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
    if (!category) return "Other"
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  }

  const getStatusLabel = (status: string) => {
    if (status === "active") return "Active"
    if (status === "completed") return "Completed"
    if (status === "paused") return "Paused"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default"
      case "completed": return "secondary"
      case "paused": return "outline"
      default: return "outline"
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Project Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Project Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Project Logo */}
                <div className="flex-shrink-0">
                  {project.logo_url ? (
                    <img
                      src={project.logo_url}
                      alt={`${project.title} logo`}
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted border flex items-center justify-center">
                      <Briefcase className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 break-words">
                    {project.title}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.category && (
                      <Badge variant="secondary">
                        <Building className="h-3 w-3 mr-1" />
                        {getCategoryLabel(project.category)}
                      </Badge>
                    )}
                    {project.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <Badge
                      variant={getStatusColor(project.status)}
                      className="text-xs"
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                    {project.looking_for_cofounder && (
                      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-xs">
                        <Users className="h-3 w-3" />
                        Looking for Cofounder
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {/* Report Button */}
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
                        <AlertDialogTitle>Report Project</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          If you believe this project violates our community guidelines or contains inappropriate content, 
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

                {/* Author Buttons */}
                {isAuthor && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    {/* Desktop Buttons */}
                    <div className="hidden sm:flex gap-2 flex-1 sm:flex-none">
                      <Link href={`/projects/${project.id}/edit`} className="flex-1 sm:flex-none">
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
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to delete this project? This action cannot be undone.
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

                    {/* Mobile Dropdown */}
                    <div className="sm:hidden flex-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full">
                            <Edit className="h-4 w-4" />
                            <span>Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="h-4 w-4" />
                              Edit Project
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => document.querySelector('[data-delete-trigger]')?.click()}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Hidden delete trigger */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button data-delete-trigger className="hidden" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">
                              Are you sure you want to delete this project? This action cannot be undone.
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

            {/* Project Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>
                  
                  {/* Share Button */}
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
          {/* Short Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">About the Project</h3>
            <p className="text-foreground leading-relaxed break-words">
              {project.short_description}
            </p>
          </div>

          {/* Detailed Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Description</h3>
            <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed break-words">
                {project.detailed_description}
              </div>
            </div>
          </div>

          {/* Looking for Cofounder Section */}
          {project.looking_for_cofounder && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-800">Looking for Co-founder!</h4>
              </div>
              <p className="text-green-700 mb-3">
                This project is actively seeking a co-founder to join the team. If you're interested in collaborating, reach out to the author.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Express Interest
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Author Card */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">About the Founder</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Link 
              href={authorMainUsername ? `/user/${authorMainUsername}` : "#"}
              className={authorMainUsername ? "cursor-pointer" : "cursor-default"}
            >
              {/* Кастомный аватар с Check на аватаре */}
              <div className="relative h-16 w-16">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                  {project.profiles?.avatar_url ? (
                    <img
                      src={project.profiles.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {getInitials(project.profiles?.display_name || project.profiles?.username)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Check на аватаре - синяя галочка */}
                {hasVerifiedBadge && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-background">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {authorMainUsername ? (
                  <Link 
                    href={`/user/${authorMainUsername}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors break-words flex items-center gap-2"
                  >
                    {project.profiles?.display_name || authorMainUsername}
                    {/* BadgeCheck рядом с именем - без контейнера */}
                    {hasVerifiedBadge && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground break-words flex items-center gap-2">
                    {project.profiles?.display_name || "Anonymous"}
                    {/* BadgeCheck рядом с именем - без контейнера */}
                    {hasVerifiedBadge && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </h3>
                )}
                {/* Остальные значки в контейнерах */}
                {(hasWhaleBadge || hasEarlyBadge) && (
                  <div className="flex items-center gap-1">
                    {hasWhaleBadge && (
                      <Badge 
                        variant="outline" 
                        className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 px-1.5 py-0.5 h-5"
                        title="Whale"
                      >
                        <GiWhaleTail className="h-3 w-3 mr-0.5" />
                      </Badge>
                    )}
                    {hasEarlyBadge && (
                      <Badge 
                        variant="outline" 
                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 px-1.5 py-0.5 h-5"
                        title="Early Supporter"
                      >
                        <GiWhaleTail className="h-3 w-3 mr-0.5" />
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Отображаем все username через запятую */}
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
              
              {project.profiles?.bio && (
                <p className="mt-2 text-sm text-muted-foreground break-words">{project.profiles.bio}</p>
              )}

              {project.profiles?.website && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={project.profiles.website.startsWith('http') ? project.profiles.website : `https://${project.profiles.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline underline-offset-2"
                    >
                      {project.profiles.website}
                      <ExternalLink className="h-3 w-3 inline ml-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Rocket className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                Interested in this project?
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {project.looking_for_cofounder 
                  ? "Contact the founder to discuss collaboration opportunities or share your feedback."
                  : "Share your thoughts or feedback about this project with the founder."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                className="gap-2"
                size="lg"
              >
                <MessageCircle className="h-4 w-4" />
                Send Message
              </Button>
              
              <Button 
                variant="outline"
                className="gap-2"
                size="lg"
                onClick={copyToClipboard}
              >
                <Share2 className="h-4 w-4" />
                Share Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                Do you want to moderate projects with us?
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
