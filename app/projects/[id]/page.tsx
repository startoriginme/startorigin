import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  Lightbulb, 
  Plus, 
  LogOut, 
  User, 
  ArrowLeft, 
  Briefcase, 
  Calendar, 
  Users, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Globe,
  MessageSquare,
  Share2,
  Copy,
  Twitter,
  Flag,
  Shield,
  Check,
  MapPin,
  Target,
  Rocket,
  Building
} from "lucide-react"
import { GiWhaleTail } from "react-icons/gi"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

// Функция для получения значков пользователя
async function getUserBadges(userId: string): Promise<Array<{badge_type: 'verified' | 'whale' | 'early'}>> {
  const supabase = await createClient()
  
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

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch project with author profile
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        bio,
        website
      )
    `)
    .eq("id", id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Get author badges
  const authorBadges = await getUserBadges(project.author_id)

  // Check if current user is the author
  const isAuthor = user?.id === project.author_id

  // Fetch user profile for avatar
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("avatar_url, display_name, username")
    .eq("id", user?.id || "")
    .single()

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
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
      case "active": return "bg-green-100 text-green-800 border-green-200"
      case "completed": return "bg-blue-100 text-blue-800 border-blue-200"
      case "paused": return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Server action for logout
  async function handleLogout() {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/auth/login")
  }

  // Server action for deleting project
  async function deleteProject() {
    "use server"
    const supabase = await createClient()
    
    // Check if user is authorized
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== project.author_id) {
      throw new Error("Not authorized")
    }

    await supabase.from("projects").delete().eq("id", id)
    redirect("/")
  }

  // Проверяем наличие значков
  const hasVerifiedBadge = authorBadges.some(b => b.badge_type === 'verified')
  const hasWhaleBadge = authorBadges.some(b => b.badge_type === 'whale')
  const hasEarlyBadge = authorBadges.some(b => b.badge_type === 'early')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">StartOrigin</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Create</span>
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
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="h-4 w-4 mr-2" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline" size="sm" className="hidden sm:flex">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" className="hidden sm:flex">Get Started</Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="sm:hidden">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/auth/login" className="cursor-pointer">Sign In</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/auth/sign-up" className="cursor-pointer">Get Started</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Projects</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

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
                          variant="outline" 
                          className={`text-xs ${getStatusColor(project.status)}`}
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
                            <AlertDialogAction className="bg-orange-600 text-white hover:bg-orange-700">
                              <Flag className="h-4 w-4 mr-2" />
                              Open Report Form
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Author Actions */}
                    {isAuthor && (
                      <div className="flex gap-2 w-full sm:w-auto">
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
                                <form action={deleteProject}>
                                  <AlertDialogAction 
                                    type="submit"
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </form>
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
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                                <Trash2 className="h-4 w-4" />
                                Delete Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Meta */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(project.created_at)}</span>
                    </div>
                    
                    {project.looking_for_cofounder && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Looking for co-founder</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Short Description */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">About the Project</h3>
                <p className="text-foreground leading-relaxed break-words">
                  {project.short_description}
                </p>
              </div>

              {/* Detailed Description */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Detailed Description</h3>
                <div className="prose prose-slate max-w-none prose-sm sm:prose-base">
                  <div className="whitespace-pre-wrap text-foreground leading-relaxed break-words">
                    {project.detailed_description}
                  </div>
                </div>
              </div>

              {/* Project Goals / Vision */}
              {project.tags?.includes("vision") || project.tags?.includes("goals") && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">Project Vision</h4>
                  </div>
                  <p className="text-blue-700">
                    {project.short_description.includes("vision") 
                      ? project.short_description 
                      : "This project aims to create innovative solutions..."}
                  </p>
                </div>
              )}

              {/* Looking for Cofounder Section */}
              {project.looking_for_cofounder && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
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
                    <MessageSquare className="h-4 w-4 mr-2" />
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
                  href={`/user/${project.profiles?.username}`}
                  className="cursor-pointer"
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
                    {project.profiles?.username ? (
                      <Link 
                        href={`/user/${project.profiles.username}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors break-words flex items-center gap-2"
                      >
                        {project.profiles.display_name || project.profiles.username}
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
                  
                  {project.profiles?.username && (
                    <p className="text-sm text-muted-foreground mb-2">
                      @{project.profiles.username}
                    </p>
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
                    <MessageSquare className="h-4 w-4" />
                    Send Message
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="gap-2"
                    size="lg"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Project
                  </Button>
                </div>
              </div>
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
