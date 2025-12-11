"use client"

import { notFound, useRouter } from "next/navigation"
import { ProjectDetail } from "@/components/project-detail"
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
import { useEffect, useState } from "react"
import { handleLogout } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"

// Функция для получения всех username пользователя (основной + алиасы)
function getAllUsernames(mainUsername: string, authorId: string): string[] {
  const userAliases: Record<string, string[]> = {
    nikolaev: ["azya", "nklv"],
    gerxog: ["admin", "tech"],
    startorigin: ["problems"],
    winter: ["zima", "vlkv", "bolt"],
  }

  const staticAliases = [mainUsername, ...(userAliases[mainUsername] || [])]

  return staticAliases
}

// Функция для получения инициалов
function getInitials(name: string | null | undefined) {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface ProjectDetailPageProps {
  params: { id: string }
}

interface Project {
  id: string
  title: string
  description: string
  author_id: string
  profiles?: {
    id: string
    username: string
    display_name: string
    avatar_url: string
    bio: string
    website: string
    disable_chat: boolean
  }
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = params
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [allUsernames, setAllUsernames] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Получаем проект
        const response = await fetch(`/api/projects/${id}`)
        if (!response.ok) {
          throw new Error("Project not found")
        }
        const projectData = await response.json()
        setProject(projectData)

        // Получаем все ники автора
        if (projectData?.profiles?.username) {
          const usernames = getAllUsernames(
            projectData.profiles.username,
            projectData.author_id
          )
          setAllUsernames(usernames)
        }

        // Получаем текущего пользователя
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
        router.push("/404")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Link href="/">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>

            {/* Desktop */}
            <div className="hidden md:flex items-center gap-4">
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
                          <AvatarImage src={userProfile?.avatar_url ?? ""} className="object-cover" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
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
                      <DropdownMenuItem asChild>
                        <button
                          onClick={async () => {
                            await handleLogout()
                          }}
                          className="flex items-center gap-2 w-full text-left cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button>Get Started</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile */}
            <div className="flex items-center gap-2 md:hidden">
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
                          <AvatarImage src={userProfile?.avatar_url ?? ""} className="object-cover" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
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
                      <DropdownMenuItem asChild>
                        <button
                          onClick={async () => {
                            await handleLogout()
                          }}
                          className="flex items-center gap-2 w-full text-left cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
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

        {/* Project Detail */}
        <ProjectDetail
          project={project}
          userId={user?.id ?? undefined}
          allUsernames={allUsernames}
        />
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
