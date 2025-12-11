"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GiWhaleTail } from "react-icons/gi"
import { 
  ArrowBigUp, Calendar, Edit, Trash2, Phone, Mail, Users, MoreVertical, Share2, Copy, Twitter, MessageCircle, Flag, Shield, Check, ExternalLink, Globe
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_verified: boolean | null
  website?: string | null
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

// === Алиасы пользователей ===
const userAliases: Record<string, string[]> = {
  "nikolaev": ["azya", "nklv"],
  "gerxog": ["admin"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv", "bolt"]
}

function getMainUsername(username: string) {
  for (const [main, aliases] of Object.entries(userAliases)) {
    if (main === username || aliases.includes(username)) return main
  }
  return username
}

function getAllUsernames(mainUsername: string) {
  return [mainUsername, ...(userAliases[mainUsername] || [])]
}

async function getDatabaseAliases(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("user_aliases").select("alias").eq("user_id", userId)
  if (error) return []
  return data?.map(d => d.alias) || []
}

async function getUserBadges(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from("user_badges").select("badge_type").eq("user_id", userId)
  if (error) return []
  return data || []
}

async function getAllUsernamesCombined(mainUsername: string, userId?: string) {
  const staticAliases = getAllUsernames(mainUsername)
  if (!userId) return staticAliases
  const dbAliases = await getDatabaseAliases(userId)
  const all = [...staticAliases, ...dbAliases.filter(a => !staticAliases.includes(a))]
  return all
}

// === Parse Mentions ===
const parseMentions = (text: string) => {
  if (!text) return text
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g
  const parts: (string | JSX.Element)[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const username = match[1]
    const mainUsername = getMainUsername(username)
    parts.push(
      <Link
        key={match.index}
        href={`/user/${mainUsername}`}
        className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        @{username}
      </Link>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : [text]
}

export function ProblemDetail({ problem, userId, initialHasUpvoted }: ProblemDetailProps) {
  const [isClient, setIsClient] = useState(false)
  const [upvotes, setUpvotes] = useState(problem.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoting, setIsUpvoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [authorAllUsernames, setAuthorAllUsernames] = useState<string[]>([])
  const [authorBadges, setAuthorBadges] = useState<Array<{ badge_type: 'verified'|'whale'|'early'}>>([])

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => setIsClient(true), [])

  useEffect(() => {
    const fetchAuthor = async () => {
      if (problem.author_id) {
        const badges = await getUserBadges(problem.author_id)
        setAuthorBadges(badges)
      }
      if (problem.profiles?.username && problem.author_id) {
        const usernames = await getAllUsernamesCombined(problem.profiles.username, problem.author_id)
        setAuthorAllUsernames(usernames)
      } else if (problem.profiles?.username) {
        setAuthorAllUsernames(getAllUsernames(problem.profiles.username))
      }
    }
    fetchAuthor()
  }, [problem.profiles?.username, problem.author_id])

  if (!isClient) return null

  const isAuthor = userId === problem.author_id
  const authorMainUsername = problem.profiles?.username ? getMainUsername(problem.profiles.username) : null
  const hasVerifiedBadge = authorBadges.some(b => b.badge_type==='verified')
  const hasWhaleBadge = authorBadges.some(b => b.badge_type==='whale')
  const hasEarlyBadge = authorBadges.some(b => b.badge_type==='early')

  const handleUpvote = async () => {
    if (!userId) { router.push("/auth/login"); return }
    setIsUpvoting(true)
    const supabase = createClient()
    try {
      if (hasUpvoted) {
        const { error } = await supabase.from("upvotes").delete().eq("problem_id", problem.id).eq("user_id", userId)
        if (!error) { setUpvotes(prev=>prev-1); setHasUpvoted(false) }
      } else {
        const { error } = await supabase.from("upvotes").insert({ problem_id: problem.id, user_id: userId })
        if (!error) { setUpvotes(prev=>prev+1); setHasUpvoted(true) }
      }
    } catch(err) { console.error(err) }
    finally { setIsUpvoting(false) }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from("problems").delete().eq("id", problem.id).eq("author_id", userId!)
      if (!error) { router.push("/problems"); router.refresh() }
    } catch(err) { console.error(err) }
    finally { setIsDeleting(false); setIsDeleteDialogOpen(false) }
  }

  const formatDate = (dateStr:string) => new Date(dateStr).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric"})
  const getInitials = (name:string|null) => !name?"U":name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)
  const getCategoryLabel = (cat:string) => cat.charAt(0).toUpperCase()+cat.slice(1).replace(/_/g," ")
  const getStatusLabel = (s:string) => s==="in_progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)
  const getContactIcon = (c:string) => c.includes("+")||/^\d+$/.test(c)?<Phone className="h-4 w-4"/>:<Mail className="h-4 w-4"/>

  const copyToClipboard = async () => {
    const url = `${window.location.origin}/problems/${problem.id}`
    try { await navigator.clipboard.writeText(url); toast({title:"Link copied!", description:"Problem link has been copied to clipboard"}); setIsShareOpen(false) }
    catch { toast({title:"Failed to copy", description:"Please copy manually", variant:"destructive"}) }
  }

  const shareOnTwitter = () => {
    const text = `Check ${problem.profiles?.username||"someone"}'s problem on StartOrigin.me!`
    const url = `${window.location.origin}/problems/${problem.id}`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank','width=550,height=420')
    setIsShareOpen(false)
  }

  const shareOnTelegram = () => {
    const text = `Check ${problem.profiles?.username||"someone"}'s problem on StartOrigin.me!`
    const url = `${window.location.origin}/problems/${problem.id}`
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,'_blank','width=550,height=420')
    setIsShareOpen(false)
  }

  const handleReport = () => {
    const googleFormUrl = "https://forms.gle/RPUEPZBQEJHZT4GFA"
    const prefill = `${googleFormUrl}?entry.123456789=${encodeURIComponent(problem.title)}&entry.987654321=${encodeURIComponent(window.location.href)}`
    window.open(prefill,'_blank','noopener,noreferrer')
    toast({title:"Opening Report Form", description:"You'll be redirected to Google Forms"})
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Problem Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold break-words">{problem.title}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {problem.category && <Badge variant="secondary">{getCategoryLabel(problem.category)}</Badge>}
                  {problem.tags?.map(tag=><Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  <Badge variant={problem.status==="open"?"default":problem.status==="solved"?"secondary":"outline"} className="text-xs">{getStatusLabel(problem.status)}</Badge>
                  {problem.looking_for_cofounder && <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-xs"><Users className="h-3 w-3"/>Looking for Cofounder</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {!isAuthor && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent text-orange-600 hover:text-orange-700 hover:bg-orange-50 flex-1 sm:flex-none">
                        <Flag className="h-4 w-4"/>
                        <span className="hidden xs:inline">Report</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Report Problem</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          If you believe this problem violates our community guidelines, you can report it using Google Forms.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="mt-0 sm:mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReport} className="bg-orange-600 text-white hover:bg-orange-700">
                          <Flag className="h-4 w-4 mr-2"/>Open Report Form
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {/* Author Buttons */}
                {isAuthor && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="hidden sm:flex gap-2 flex-1 sm:flex-none">
                      <Link href={`/problems/${problem.id}/edit`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full sm:w-auto"><Edit className="h-4 w-4"/>Edit</Button>
                      </Link>
                      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto">
                            <Trash2 className="h-4 w-4"/>Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm">Are you sure you want to delete this problem? This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting?"Deleting...":"Delete"}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="sm:hidden flex-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent w-full"><MoreVertical className="h-4 w-4"/><span>Actions</span></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild><Link href={`/problems/${problem.id}/edit`} className="flex items-center gap-2 cursor-pointer w-full"><Edit className="h-4 w-4"/>Edit Problem</Link></DropdownMenuItem>
                          <DropdownMenuSeparator/>
                          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={()=>setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4"/>Delete Problem</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-4">
                <Button variant={hasUpvoted?"default":"outline"} size="sm" className="flex-col gap-1 h-auto py-2 px-3 min-w-[60px]" onClick={handleUpvote} disabled={isUpvoting}><ArrowBigUp className="h-5 w-5"/><span className="text-sm font-semibold">{upvotes}</span></Button>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Calendar className="h-4 w-4"/><span>{formatDate(problem.created_at)}</span></div>
                  <DropdownMenu open={isShareOpen} onOpenChange={setIsShareOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground"><Share2 className="h-4 w-4"/><span className="hidden xs:inline">Share</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={copyToClipboard} className="cursor-pointer"><Copy className="h-4 w-4 mr-2"/>Copy Link</DropdownMenuItem>
                      <DropdownMenuItem onClick={shareOnTwitter} className="cursor-pointer"><Twitter className="h-4 w-4 mr-2"/>Share on X</DropdownMenuItem>
                      <DropdownMenuItem onClick={shareOnTelegram} className="cursor-pointer"><MessageCircle className="h-4 w-4 mr-2"/>Share on Telegram</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed break-words">{parseMentions(problem.description)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Author Card */}
      <Card>
        <CardHeader><h2 className="text-lg font-semibold">About the Author</h2></CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Link href={authorMainUsername?`/user/${authorMainUsername}`:"#"} className={authorMainUsername?"cursor-pointer":"cursor-default"}>
              <div className="relative h-16 w-16">
                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted">
                  {problem.profiles?.avatar_url?<img src={problem.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center bg-muted"><span className="text-lg font-semibold text-muted-foreground">{getInitials(problem.profiles?.display_name||problem.profiles?.username)}</span></div>}
                </div>
                {hasVerifiedBadge && <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-background"><Check className="h-3 w-3 text-white"/></div>}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {authorMainUsername?<Link href={`/user/${authorMainUsername}`} className="font-semibold text-foreground hover:text-primary transition-colors break-words flex items-center gap-2">{problem.profiles?.display_name||authorMainUsername}{hasVerifiedBadge&&<Check className="h-4 w-4 text-blue-500" title="Verified"/>}</Link>:<h3 className="font-semibold text-foreground break-words flex items-center gap-2">{problem.profiles?.display_name||"Anonymous"}{hasVerifiedBadge&&<Check className="h-4 w-4 text-blue-500" title="Verified"/>}</h3>}
                {(hasWhaleBadge||hasEarlyBadge)&&<div className="flex items-center gap-1">{hasWhaleBadge&&<Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 px-1.5 py-0.5 h-5" title="Whale"><GiWhaleTail className="h-3 w-3 mr-0.5"/></Badge>}{hasEarlyBadge&&<Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 px-1.5 py-0.5 h-5" title="Early Supporter"><GiWhaleTail className="h-3 w-3 mr-0.5"/></Badge>}</div>}
              </div>
              {authorAllUsernames.length>0&&<div className="flex flex-wrap items-center gap-1 mb-2">{authorAllUsernames.map((u,i)=><span key={u} className="text-sm text-muted-foreground">@{u}{i<authorAllUsernames.length-1&&", "}</span>)}</div>}
              {problem.profiles?.bio&&<p className="mt-2 text-sm text-muted-foreground break-words">{problem.profiles.bio}</p>}
              {problem.contact&&<div className="mt-4 pt-4 border-t"><h4 className="text-sm font-semibold text-foreground mb-2">Contact Information</h4><div className="flex items-center gap-2 text-sm text-muted-foreground">{getContactIcon(problem.contact)}<span className="font-mono break-all">{problem.contact}</span></div></div>}
              {problem.profiles?.website&&<div className="mt-4 pt-4 border-t"><h4 className="text-sm font-semibold text-foreground mb-2">Website</h4><div className="flex items-center gap-2 text-sm text-muted-foreground"><Globe className="h-4 w-4"/><a href={problem.profiles.website.startsWith('http')?problem.profiles.website:`https://${problem.profiles.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline underline-offset-2 break-all">{problem.profiles.website}<ExternalLink className="h-3 w-3 inline ml-1"/></a></div></div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center"><div className="p-3 bg-blue-100 rounded-full"><Shield className="h-8 w-8 text-blue-600"/></div></div>
            <div className="space-y-2"><h3 className="text-xl font-bold text-foreground">Do you want to moderate problems with us?</h3><p className="text-muted-foreground max-w-2xl mx-auto">Help maintain a high-quality community by reviewing and moderating content. Pass a test and we can discuss conditions of your work.</p></div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white gap-2" size="lg"><a href="https://docs.google.com/forms/d/e/1FAIpQLSd2tJLo1tfTqwYeuOACX126ZoYWk9Iegl4CZHqozXNJSJSiMw/viewform?usp=dialog" target="_blank" rel="noopener noreferrer"><Shield className="h-4 w-4"/>Pass a test</a></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
