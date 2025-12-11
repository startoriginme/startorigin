"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ProblemDetail } from "@/components/project-detail"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowLeft, LogOut, User } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { handleLogout } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

function getAllUsernames(mainUsername: string, authorId: string): string[] {
  const userAliases: Record<string, string[]> = {
    nikolaev: ["azya", "nklv"],
    gerxog: ["admin", "tech"],
    startorigin: ["problems"],
    winter: ["zima", "vlkv", "bolt"],
  }
  return [mainUsername, ...(userAliases[mainUsername] || [])]
}

function getInitials(name: string | null | undefined) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function ProjectDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [allUsernames, setAllUsernames] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setError("No project ID provided")
        setLoading(false)
        return
      }

      try {
        console.log("Fetching project with ID:", id)
        
        // 1. Fetch project from API
        const response = await fetch(`/api/projects/${id}`)
        console.log("Response status:", response.status)
        
        const data = await response.json()
        console.log("Response data:", data)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Project not found")
            toast.error("Project not found")
          } else {
            setError(data.error || "Failed to load project")
            toast.error(data.error || "Failed to load project")
          }
          setProject(null)
          return
        }

        setProject(data)

        // 2. Get author usernames
        if (data?.profiles?.username) {
          const usernames = getAllUsernames(
            data.profiles.username,
            data.author_id
          )
          setAllUsernames(usernames)
        }

        // 3. Get current user
        const supabase = createClient()
        const { data: { user: authUser } = {} } = await supabase.auth.getUser()
        setUser(authUser ?? null)

        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url, display_name, username")
            .eq("id", authUser.id)
            .single()
          setUserProfile(profile ?? null)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Network error. Please try again.")
        toast.error("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Отображаем загрузку
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SkeletonHeader />
        <main className="container mx-auto px-4 py-8 flex-1">
          <Skeleton className="h-12 w-32 mb-6" />
          <Skeleton className="h-[500px] w-full" />
        </main>
      </div>
    )
  }

  // Отображаем ошибку
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header user={user} userProfile={userProfile} />
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Projects</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4 text-red-600">{error}</h2>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // Отображаем проект
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header user={user} userProfile={userProfile} />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Projects</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        {project ? (
          <ProblemDetail
            project={project}
            userId={user?.id ?? undefined}
            allUsernames={allUsernames}
          />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">No project data</h2>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        )}
      </main>

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

// Компоненты Header и SkeletonHeader остаются такими же, как в предыдущем коде
function Header({ user, userProfile }: { user: any; userProfile: any }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">StartOrigin</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <Link href="/problems/new" className="hidden md:block">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Share Problem
                  </Button>
                </Link>
                <Link href="/problems/new" className="md:hidden">
                  <Button size="icon" className="h-9 w-9">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userProfile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials(userProfile?.display_name ?? userProfile?.username)}
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
                    <DropdownMenuItem
                      onClick={async () => {
                        await handleLogout()
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/sign-up">
                  <Button size="sm" className="hidden md:inline-flex">
                    Get Started
                  </Button>
                </Link>
                <div className="flex gap-2 md:hidden">
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm">Start</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

function SkeletonHeader() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
      </div>
    </header>
  )
}
