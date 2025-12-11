"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, ArrowUp, MessageSquare, ExternalLink, Eye, Briefcase, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  profiles: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface ProjectsFeedProps {
  initialProjects: Project[]
  userId?: string
}

export function ProjectsFeed({ initialProjects, userId }: ProjectsFeedProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return "Today"
    if (diffInDays === 1) return "Yesterday"
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
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

  return (
    <div className="space-y-4">
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6">Be the first to share your project!</p>
          <Link href="/problems/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Share Your Project
            </Button>
          </Link>
        </div>
      ) : (
        projects.map((project) => (
          <Card key={project.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-4">
                {project.logo_url ? (
                  <div className="flex-shrink-0">
                    <img
                      src={project.logo_url}
                      alt={`${project.title} logo`}
                      className="w-16 h-16 rounded-lg object-cover border"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted border flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <Link href={`/projects/${project.id}`}>
                    <h3 className="mb-2 text-xl font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 break-words">
                      {project.title}
                    </h3>
                  </Link>
                  <p className="text-muted-foreground line-clamp-2 break-words">
                    {project.short_description}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pb-3">
              <div className="flex flex-wrap gap-2">
                {project.category && (
                  <Badge variant="secondary">{getCategoryLabel(project.category)}</Badge>
                )}
                {project.tags?.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                {project.looking_for_cofounder && (
                  <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                    <Users className="h-3 w-3" />
                    Looking for Cofounder
                  </Badge>
                )}
                <Badge
                  variant={
                    project.status === "active" ? "default" : 
                    project.status === "completed" ? "secondary" : 
                    "outline"
                  }
                >
                  {project.status === "active" ? "Active" : 
                   project.status === "completed" ? "Completed" : 
                   project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={project.profiles?.avatar_url || ""} 
                    alt="Profile avatar"
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(project.profiles?.display_name || project.profiles?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {project.profiles?.display_name || project.profiles?.username || "Anonymous"}
                  </p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formatDate(project.created_at)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="sm" className="gap-2 whitespace-nowrap">
                    <Eye className="h-4 w-4" />
                    View Details
                  </Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )
}
