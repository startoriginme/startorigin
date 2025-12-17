"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GiWhaleTail } from "react-icons/gi";
import { ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users, MoreVertical, Share2, Copy, Twitter, MessageCircle, Flag, Shield, Check } from "lucide-react"
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

// Функция для определения цвета бейджа статуса
const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200'
    case 'solved':
      return 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200'
    case 'closed':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200'
    default:
      // Для open, post, announcement, project - цвет как у open (синий)
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200'
  }
}

// Упрощенная функция для преобразования Markdown в HTML
const parseMarkdown = (text: string) => {
  if (!text) return text
  
  // Обработка жирного текста: **текст** или __текст__
  let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__(.*?)__/g, '<strong>$1</strong>')
  
  // Обработка курсива: *текст* или _текст_
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>')
  result = result.replace(/_(.*?)_/g, '<em>$1</em>')
  
  // Обработка заголовков
  result = result.replace(/^### (.*$)/gm, '<h3>$1</h3>')
  result = result.replace(/^## (.*$)/gm, '<h2>$1</h2>')
  result = result.replace(/^# (.*$)/gm, '<h1>$1</h1>')
  
  // Обработка списков
  result = result.replace(/^- (.*$)/gm, '<li>$1</li>')
  result = result.replace(/^\* (.*$)/gm, '<li>$1</li>')
  result = result.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
  
  // Обработка блоков кода
  result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
  
  // Обработка строчного кода
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // Обработка цитат
  result = result.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
  
  // Обработка ссылок: [текст](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Проверяем, является ли ссылка упоминанием
    if (url.startsWith('/user/')) {
      return `<a href="${url}" class="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors">${text}</a>`
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">${text}</a>`
  })
  
  // Обработка упоминаний: @username
  result = result.replace(/@([a-zA-Z0-9_-]+)/g, (match, username) => {
    const mainUsername = getMainUsername(username)
    return `<a href="/user/${mainUsername}" class="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors">@${username}</a>`
  })
  
  // Обработка простых URL (без Markdown ссылок)
  result = result.replace(/(https?:\/\/[^\s]+)/g, (match, url) => {
    // Если URL уже внутри ссылки, не обрабатываем
    if (result.includes(`href="${url}"`)) return match
    
    const cleanUrl = url.replace(/[.,;:!?)]*$/, '')
    const displayText = cleanUrl.length > 50 ? cleanUrl.substring(0, 47) + '...' : cleanUrl
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 break-all">${displayText}</a>`
  })
  
  // Заменяем переносы строк на <br> и параграфы
  result = result.replace(/\n\n/g, '</p><p>')
  result = result.replace(/\n/g, '<br>')
  
  // Оборачиваем в параграф, если не обернуто
  if (!result.startsWith('<')) {
    result = `<p>${result}</p>`
  }
  
  return result
}

// Компонент для безопасного рендеринга HTML
const SafeHTML = ({ html, className = "" }: { html: string, className?: string }) => {
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
  const [authorBadges, setAuthorBadges] = useState<Array<{badge_type: 'verified' | 'whale' | 'early'}>>([])
  
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const fetchAuthorData = async () => {
      if (problem.author_id) {
        // Получаем значки автора
        const badges = await getUserBadges(problem.author_id)
        setAuthorBadges(badges)
      }
      
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
    
    fetchAuthorData()
  }, [problem.profiles?.username, problem.author_id])

  const isAuthor = userId === problem.author_id
  
  // Получаем основной username автора
  const authorMainUsername = problem.profiles?.username ? getMainUsername(problem.profiles.username) : null

  // Проверяем наличие значков
  const hasVerifiedBadge = authorBadges.some(b => b.badge_type === 'verified')
  const hasWhaleBadge = authorBadges.some(b => b.badge_type === 'whale')
  const hasEarlyBadge = authorBadges.some(b => b.badge_type === 'early')

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
    const googleFormUrl = "https://forms.gle/RPUEPZBQEJHZT4GFA"
    
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

  // Преобразуем Markdown в HTML
  const htmlContent = parseMarkdown(problem.description || "")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Problem Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Заголовок и кнопки действий */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 break-words">
                  {problem.title}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {problem.category && <Badge variant="secondary">{getCategoryLabel(problem.category)}</Badge>}
                  {problem.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(problem.status)}`}
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
          <div className="prose prose-slate max-w-none prose-sm sm:prose-base dark:prose-invert">
            <div className="break-words">
              <SafeHTML 
                html={htmlContent}
                className="markdown-content"
              />
              <style jsx>{`
                .markdown-content {
                  line-height: 1.6;
                }
                .markdown-content h1 {
                  font-size: 1.875rem;
                  font-weight: bold;
                  margin-top: 1.5rem;
                  margin-bottom: 0.75rem;
                }
                .markdown-content h2 {
                  font-size: 1.5rem;
                  font-weight: bold;
                  margin-top: 1.25rem;
                  margin-bottom: 0.5rem;
                }
                .markdown-content h3 {
                  font-size: 1.25rem;
                  font-weight: bold;
                  margin-top: 1rem;
                  margin-bottom: 0.5rem;
                }
                .markdown-content p {
                  margin: 0.75rem 0;
                }
                .markdown-content strong {
                  font-weight: bold;
                }
                .markdown-content em {
                  font-style: italic;
                }
                .markdown-content ul {
                  list-style-type: disc;
                  padding-left: 1.25rem;
                  margin: 0.75rem 0;
                }
                .markdown-content ol {
                  list-style-type: decimal;
                  padding-left: 1.25rem;
                  margin: 0.75rem 0;
                }
                .markdown-content li {
                  margin: 0.25rem 0;
                }
                .markdown-content blockquote {
                  border-left: 4px solid #d1d5db;
                  padding-left: 1rem;
                  font-style: italic;
                  color: #4b5563;
                  margin: 1rem 0;
                }
                .markdown-content pre {
                  background-color: #f3f4f6;
                  padding: 1rem;
                  border-radius: 0.375rem;
                  overflow-x: auto;
                  margin: 1rem 0;
                }
                .markdown-content code {
                  background-color: #f3f4f6;
                  padding: 0.125rem 0.375rem;
                  border-radius: 0.25rem;
                  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                  font-size: 0.875rem;
                }
                .markdown-content a {
                  text-decoration: underline;
                  text-underline-offset: 2px;
                }
                .markdown-content br {
                  display: block;
                  content: "";
                  margin: 0.5rem 0;
                }
              `}</style>
            </div>
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
            <Link 
              href={authorMainUsername ? `/user/${authorMainUsername}` : "#"}
              className={authorMainUsername ? "cursor-pointer" : "cursor-default"}
            >
              {/* Кастомный аватар с Check на аватаре */}
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
                    {problem.profiles?.display_name || authorMainUsername}
                    {/* BadgeCheck рядом с именем - без контейнера */}
                    {hasVerifiedBadge && (
                      <Check className="h-4 w-4 text-blue-500" title="Verified" />
                    )}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-foreground break-words flex items-center gap-2">
                    {problem.profiles?.display_name || "Anonymous"}
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
      }
      
