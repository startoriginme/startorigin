import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileActions } from "./actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Lightbulb, ArrowLeft, Edit, LogOut, Plus, MoreVertical } from "lucide-react"
import { ProblemCard } from "@/components/problem-card"

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

  // Fetch user's problems with profiles data
  const { data: problems } = await supabase
    .from("problems")
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
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
            
            {/* Back to Problems button - visible on all screens */}
            <Link href="/problems">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Problems</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
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
                
                {/* Action buttons - visible on desktop */}
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  </Link>
                  <form action={handleSignOut}>
                    <Button variant="outline" size="sm" type="submit" className="gap-2 bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </form>
                </div>

                {/* Mobile dropdown - visible on mobile */}
                <div className="md:hidden relative group">
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent p-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-md border border-border bg-background shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <Link 
                        href="/profile/edit" 
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Link>
                      <form action={handleSignOut}>
                        <button 
                          type="submit" 
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
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
                    <ProblemCard 
                      key={problem.id} 
                      problem={problem} 
                      userId={user.id} 
                    />
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
