import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Lightbulb, Plus, LogOut, Calendar, MessageSquare, ArrowBigUp, Edit } from "lucide-react"
import { MobileMenu } from "@/components/mobile-menu"

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
              <MobileMenu user={user} />
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
                <div className="space-y-4">
                  {problems.map((problem) => (
                    <Link key={problem.id} href={`/problems/${problem.id}`}>
                      <Card className="transition-shadow hover:shadow-md cursor-pointer">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="mb-2 text-lg font-semibold text-foreground hover:text-primary transition-colors">
                                {problem.title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2">{problem.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {problem.category && <Badge variant="secondary">{problem.category}</Badge>}
                                <Badge
                                  variant={
                                    problem.status === "open"
                                      ? "default"
                                      : problem.status === "solved"
                                        ? "secondary"
                                        : "outline"
                                  }
                                >
                                  {problem.status}
                                </Badge>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(problem.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ArrowBigUp className="h-4 w-4" />
                                  <span>{problem.upvotes}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>{problem.comment_count}</span>
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
                <div className="py-8 text-center text-muted-foreground">
                  <p className="mb-4">You haven't shared any problems yet.</p>
                  <Link href="/problems/new">
                    <Button>Share Your First Problem</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
