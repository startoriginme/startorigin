"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users, MoreVertical, Share2, Copy, Twitter, MessageCircle, Flag, Shield, Check, Sparkles } from "lucide-react"
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
import { ProblemAnimationModal } from "@/components/problem-animation-modal"

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
  animation_type?: string | null
}

type ProblemDetailProps = {
  problem: Problem
  userId?: string
  initialHasUpvoted: boolean
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

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string): string[] {
  return [mainUsername, ...(userAliases[mainUsername] || [])]
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

// Функция для объединения статических и базы данных алиасов
async function getAllUsernamesCombined(mainUsername: string, userId?: string): Promise<string[]> {
  const staticAliases = getAllUsernames(mainUsername)
  
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

// Функция для преобразования текста с упоминаниями в ссылки
const parseMentions = (text: string) => {
  if (!text) return text;
  
  // Регулярное выражение для поиска упоминаний вида @username
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Добавляем текст до упоминания
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Добавляем ссылку для упоминания
    const username = match[1];
    const mainUsername = getMainUsername(username)
    parts.push(
      <Link
        key={match.index}
        href={`/user/${mainUsername}`}
        className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Список подтвержденных пользователей
const verifiedUsers = ["startorigin", "nikolaev", "winter", "gerxog"]

// Стили для анимаций
const animationStyles = `
@keyframes snowFall {
  0% {
    transform: translateY(-20px) translateX(0) rotate(0deg);
    opacity: 0.6;
  }
  100% {
    transform: translateY(100vh) translateX(var(--snow-x)) rotate(360deg);
    opacity: 0;
  }
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-10px) translateX(5px); }
}

@keyframes bellSwing {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(5deg) scale(1.05); }
}

@keyframes snowDrift {
  0% {
    transform: translateY(-10px) translateX(0) rotate(0deg);
    opacity: 0.4;
  }
  100% {
    transform: translateY(100vh) translateX(var(--drift-x)) rotate(180deg);
    opacity: 0;
  }
}

@keyframes lightningMain {
  0%, 100% { opacity: 0.1; transform: scale(1) rotate(0deg); }
  25% { opacity: 0.25; transform: scale(1.1) rotate(5deg); }
  50% { opacity: 0.35; transform: scale(1.2) rotate(-5deg); }
  75% { opacity: 0.25; transform: scale(1.1) rotate(5deg); }
}

@keyframes lightningFlash {
  0% { opacity: 0; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1); }
}

@keyframes particleFloat {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.05; }
  50% { transform: translateY(-15px) translateX(8px); opacity: 0.15; }
}

.animate-snow-fall {
  animation: snowFall linear infinite;
}

.animate-float-slow {
  animation: floatSlow 6s ease-in-out infinite;
}

.animate-bell-swing {
  animation: bellSwing 3s ease-in-out infinite;
}

.animate-snow-drift {
  animation: snowDrift linear infinite;
}

.animate-lightning-main {
  animation: lightningMain 5s ease-in-out infinite;
}

.animate-lightning-flash {
  animation: lightningFlash 0.4s ease-in-out infinite;
}

.animate-particle-float {
  animation: particleFloat ease-in-out infinite;
}
`

// Компонент анимации снега
const SnowAnimation = () => (
  <>
    <style>{animationStyles}</style>
    {[...Array(40)].map((_, i) => {
      const snowX = Math.random() * 50 - 25
      return (
        <div
          key={i}
          className="absolute pointer-events-none text-blue-200/30 opacity-60 animate-snow-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 3 + 5}s`,
            fontSize: `${Math.random() * 12 + 10}px`,
            '--snow-x': `${snowX}px`
          } as React.CSSProperties}
        >
          ❄
        </div>
      )
    })}
  </>
)

// Компонент новогодней анимации
const ChristmasAnimation = () => (
  <>
    <style>{animationStyles}</style>
    {/* Размытые новогодние элементы по всей карточке */}
    <div className="absolute top-4 right-8 text-green-300/20 text-4xl blur-[2px] opacity-30 animate-float-slow">
      🎄
    </div>
    <div 
      className="absolute bottom-12 right-12 text-green-300/20 text-4xl blur-[2px] opacity-30 animate-float-slow" 
      style={{animationDelay: '1s'} as React.CSSProperties}
    >
      🎄
    </div>
    <div className="absolute top-16 right-16 text-yellow-300/20 text-3xl blur-[2px] opacity-30 animate-bell-swing">
      🔔
    </div>
    <div 
      className="absolute bottom-24 right-24 text-yellow-300/20 text-3xl blur-[2px] opacity-30 animate-bell-swing" 
      style={{animationDelay: '0.5s'} as React.CSSProperties}
    >
      🔔
    </div>
    
    {/* Снежинки */}
    {[...Array(20)].map((_, i) => {
      const driftX = Math.random() * 40 - 20
      return (
        <div
          key={i}
          className="absolute pointer-events-none text-blue-100/40 opacity-40 animate-snow-drift"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${Math.random() * 4 + 6}s`,
            fontSize: `${Math.random() * 10 + 8}px`,
            '--drift-x': `${driftX}px`
          } as React.CSSProperties}
        >
          ❅
        </div>
      )
    })}
  </>
)

// Компонент анимации Stranger Things
const StrangerThingsAnimation = () => (
  <>
    <style>{animationStyles}</style>
    {/* Размытые молнии */}
    <div className="absolute top-8 right-10 text-red-300/15 text-6xl blur-[3px] opacity-20 animate-lightning-main">
      ⚡
    </div>
    <div 
      className="absolute bottom-16 right-20 text-red-300/15 text-5xl blur-[3px] opacity-20 animate-lightning-main" 
      style={{animationDelay: '1.5s'} as React.CSSProperties}
    >
      ⚡
    </div>
    
    {/* Мелкие молнии */}
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute pointer-events-none text-red-400/20 blur-[1px] opacity-30 animate-lightning-flash"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 3}s`,
          fontSize: `${Math.random() * 20 + 15}px`,
        } as React.CSSProperties}
      >
        ⚡
      </div>
    ))}
    
    {/* Парящие красные частицы */}
    {[...Array(25)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full pointer-events-none animate-particle-float"
        style={{
          width: `${Math.random() * 4 + 1}px`,
          height: `${Math.random() * 4 + 1}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 12 + 8}s`,
          background: `rgba(239, 68, 68, ${Math.random() * 0.1 + 0.05})`,
          filter: 'blur(0.5px)',
        } as React.CSSProperties}
      />
    ))}
  </>
)

// Компонент для отображения анимации на основе типа
const AnimationRenderer = ({ animationType }: { animationType?: string | null }) => {
  if (!animationType) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {animationType === 'let_it_snow' && <SnowAnimation />}
      {animationType === 'merry_christmas' && <ChristmasAnimation />}
      {animationType === 'stranger_things' && <StrangerThingsAnimation />}
    </div>
  )
}

export function ProblemDetail({ 
  problem, 
  userId, 
  initialHasUpvoted
}: ProblemDetailProps) {
  const [isClient, setIsClient] = useState(false)
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [authorAllUsernames, setAuthorAllUsernames] = useState<string[]>([])
  const [showAnimationModal, setShowAnimationModal] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(problem.animation_type || null)
  const [isSavingAnimation, setIsSavingAnimation] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const fetchAuthorAliases = async () => {
      if (problem.profiles?.username && problem.author_id) {
        const usernames = await getAllUsernamesCombined(
          problem.profiles.username, 
          problem.author_id
        )
        setAuthorAllUsernames(usernames)
      } else if (problem.profiles?.username) {
        setAuthorAllUsernames(getAllUsernames(problem.profiles.username))
      }
    }
    
    fetchAuthorAliases()
  }, [problem.profiles?.username, problem.author_id])

  const isAuthor = userId === problem.author_id
  
  // Получаем основной username автора
  const authorMainUsername = problem.profiles?.username ? getMainUsername(problem.profiles.username) : null
  const isVerifiedUser = authorMainUsername ? verifiedUsers.includes(authorMainUsername) : false

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

  const handleAnimationSelect = async (animationType: string | null) => {
    setIsSavingAnimation(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from("problems")
        .update({ animation_type: animationType })
        .eq("id", problem.id)
        .eq("author_id", userId!)

      if (error) {
        throw error
      }

      setCurrentAnimation(animationType)
      setShowAnimationModal(false)
      
      toast({
        title: "Animation updated!",
        description: animationType ? 
          "Your problem now has a cool animation!" : 
          "Animation has been removed from your problem.",
      })

      // Обновляем страницу для отображения изменений
      router.refresh()
    } catch (error) {
      console.error("Error updating animation:", error)
      toast({
        title: "Failed to update animation",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSavingAnimation(false)
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

  const handleReport = () => {
    // Google Forms URL для жалоб - ЗАМЕНИ НА СВОЙ URL
    const googleFormUrl = "https://forms.gle/RPUEPZBQEJHZT4GFA"
    
    // Автозаполнение полей
    const prefillUrl = `${googleFormUrl}?entry.123456789=${encodeURIComponent(problem.title)}&entry.987654321=${encodeURIComponent(window.location.href)}`
    
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
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Problem Card с анимацией */}
      <Card className="relative overflow-hidden">
        {/* Анимация внутри карточки */}
        <AnimationRenderer animationType={currentAnimation} />
        
        {/* Затемнение для лучшей читаемости текста */}
        {currentAnimation && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/85 to-transparent z-0" />
        )}
        
        {/* Контент поверх анимации */}
        <div className="relative z-10">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4">
              {/* Заголовок и кнопки действий */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 break-words">
                    {problem.title}
                  </h1>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {problem.category && (
                      <Badge variant="secondary">
                        {getCategoryLabel(problem.category)}
                      </Badge>
                    )}
                    {problem.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    <Badge
                      variant={
                        problem.status === "open" ? "default" : problem.status === "solved" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {getStatusLabel(problem.status)}
                    </Badge>
                    {problem.looking_for_cofounder && (
                      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-xs">
                        <Users className="h-3 w-3" />
                        Looking for Cofounder
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                  {/* Кнопка анимации - только для автора */}
                  {isAuthor && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-transparent hover:bg-purple-50 hover:text-purple-700 text-purple-600"
                      onClick={() => setShowAnimationModal(true)}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden xs:inline">Animation</span>
                    </Button>
                  )}

                  {/* Кнопка пожаловаться - скрыта для автора */}
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
                          <AlertDialogTitle>Report Problem</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm">
                            If you believe this problem violates our community guidelines or contains inappropriate content, 
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

                  {/* Кнопки автора */}
                  {isAuthor && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      {/* Основные кнопки для десктопа */}
                      <div className="hidden sm:flex gap-2 flex-1 sm:flex-none">
                        <Link href={`/problems/${problem.id}/edit`} className="flex-1 sm:flex-none">
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
                              <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Are you sure you want to delete this problem? This action cannot be undone.
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

                      {/* Dropdown меню для мобильных */}
                      <div className="sm:hidden flex-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full">
                              <MoreVertical className="h-4 w-4" />
                              <span>Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => setShowAnimationModal(true)} className="cursor-pointer">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Add Animation
                            </DropdownMenuItem>
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
                          <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Are you sure you want to delete this problem? This action cannot be undone.
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

              {/* Upvote и мета-информация */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <Button
                    variant={hasUpvoted ? "default" : "outline"}
                    size="sm"
                    className="flex-col gap-1 h-auto py-2 px-3 min-w-[60px]"
                    onClick={handleUpvote}
                    disabled={isUpvoting}
                  >
                    <ArrowBigUp className="h-5 w-5" />
                    <span className="text-sm font-semibold">{upvotes}</span>
                  </Button>

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
            <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
              <div className="whitespace-pre-wrap text-foreground leading-relaxed break-words">
                {parseMentions(problem.description)}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Author Card (без анимации) */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">About the Author</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Link 
              href={authorMainUsername ? `/user/${authorMainUsername}` : "#"}
              className={authorMainUsername ? "cursor-pointer" : "cursor-default"}
            >
              {/* Кастомный аватар с галочкой верификации */}
              <div className="relative h-16 w-16">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                  {problem.profiles?.avatar_url ? (
                    <img
                      src={problem.profiles.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-lg font-semibold text-muted-foreground">
                        {getInitials(problem.profiles?.display_name || problem.profiles?.username)}
                      </span>
                    </div>
                  )}
                </div>
                {/* Галочка верификации */}
                {isVerifiedUser && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-background">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {authorMainUsername ? (
                  <Link 
                    href={`/user/${authorMainUsername}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors break-words flex items-center gap-1"
                  >
                    {problem.profiles?.display_name || authorMainUsername}
                    {isVerifiedUser && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground break-words flex items-center gap-1">
                    {problem.profiles?.display_name || "Anonymous"}
                    {isVerifiedUser && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </h3>
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
              
              {problem.profiles?.bio && (
                <p className="mt-2 text-sm text-muted-foreground break-words">{problem.profiles.bio}</p>
              )}

              {problem.contact && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getContactIcon(problem.contact)}
                    <span className="font-mono break-all">{problem.contact}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Section (без анимации) */}
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
                Do you want to moderate problems with us?
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

      {/* Модальное окно выбора анимации */}
      <ProblemAnimationModal
        isOpen={showAnimationModal}
        onClose={() => setShowAnimationModal(false)}
        onSelectAnimation={handleAnimationSelect}
        currentAnimation={currentAnimation}
        isLoading={isSavingAnimation}
      />
    </div>
  )
}
