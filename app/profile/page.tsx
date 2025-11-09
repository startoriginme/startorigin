import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, Calendar, MessageSquare, ArrowBigUp, Edit, Eye } from "lucide-react"
import { ProfileMobileMenu } from "@/components/profile-mobile-menu"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch user's problems
  const { data: problems } = await supabase
    .from("problems")
    .select("*")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })

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
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const getStatusLabel = (status: string) => {
    if (status === "in_progress") return "In Progress"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>
            
            {/* Desktop Navigation - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              <Link href="/problems/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Share Problem
                </Button>
              </Link>
              <form action={handleSignOut}>
                <Button variant="outline" type="submit" className="gap-2 bg-transparent">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </form>
            </div>

            {/* Mobile Menu Button - hidden on desktop */}
            <div className="md:hidden">
              <ProfileMobileMenu user={user} onSignOut={handleSignOut} />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile</CardTitle>
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(profile?.display_name || profile?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile?.display_name || profile?.username || "Anonymous"}
                  </h2>
                  {profile?.username && <p className="text-muted-foreground">@{profile.username}</p>}
                  <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
                  {profile?.bio && <p className="mt-4 text-foreground">{profile.bio}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User's Problems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Problems ({problems?.length || 0})</CardTitle>
                <Link href="/problems/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Problem
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {problems && problems.length > 0 ? (
                <div className="space-y-6">
                  {problems.map((problem) => (
                    <Link key={problem.id} href={`/problems/${problem.id}`}>
                      <Card className="transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer border-2 hover:border-primary/20 group">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {problem.title}
                                </h3>
                                <div className="flex items-center gap-1 text-muted-foreground ml-4">
                                  <Eye className="h-4 w-4" />
                                  <span className="text-sm">View</span>
                                </div>
                              </div>
                              
                              <p className="text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                                {problem.description}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 mb-4">
                                {problem.category && (
                                  <Badge variant="secondary" className="px-3 py-1">
                                    {getCategoryLabel(problem.category)}
                                  </Badge>
                                )}
                                {problem.tags?.map((tag) => (
                                  <Badge key={tag} variant="outline" className="px-2 py-1">
                                    {tag}
                                  </Badge>
                                ))}
                                <Badge
                                  variant={
                                    problem.status === "open"
                                      ? "default"
                                      : problem.status === "solved"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className="px-3 py-1"
                                >
                                  {getStatusLabel(problem.status)}
                                </Badge>
                                {problem.looking_for_cofounder && (
                                  <Badge variant="default" className="px-3 py-1 bg-green-600 hover:bg-green-700 gap-1">
                                    <Plus className="h-3 w-3" />
                                    Seeking Cofounder
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-3 border-t border-border">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(problem.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ArrowBigUp className="h-4 w-4" />
                                  <span className="font-medium">{problem.upvotes} upvotes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  <span className="font-medium">{problem.comment_count} comments</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="mx-auto max-w-md space-y-4">
                    <div className="rounded-full bg-muted p-6 w-16 h-16 mx-auto flex items-center justify-center">
                      <Lightbulb className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">No problems yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Share your first problem and start collaborating with the community
                    </p>
                    <Link href="/problems/new">
                      <Button size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Share Your First Problem
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
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
