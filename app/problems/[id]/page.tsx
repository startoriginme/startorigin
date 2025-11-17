import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemDetail } from "@/components/problem-detail"
import { Button } from "@/components/ui/button"
import { Lightbulb, Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { MobileMenu } from "@/components/mobile-menu"

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: problem, error } = await supabase
    .from("problems")
    .select(
      `*,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )`
    )
    .eq("id", id)
    .single()

  if (error || !problem) {
    notFound()
  }

  // Получаем пользователя, но не требуем аутентификации
  let user = null
  let hasUpvoted = false

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser

    // Проверяем апвоут только если пользователь авторизован
    if (user) {
      const { data: upvote } = await supabase
        .from("upvotes")
        .select("id")
        .eq("problem_id", id)
        .eq("user_id", user.id)
        .single()

      hasUpvoted = !!upvote
    }
  } catch (error) {
    // Игнорируем ошибки аутентификации - страница доступна без логина
    console.log("Auth error, but page is still accessible:", error)
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
            
            {/* Desktop Navigation - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <Link href="/problems/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Share Problem
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline">Profile</Button>
                  </Link>
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

            {/* Mobile Menu Button - hidden on desktop */}
            <div className="md:hidden">
              <MobileMenu user={user} />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/problems">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Problems</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
        </div>

        <ProblemDetail
          problem={problem}
          userId={user?.id}
          initialHasUpvoted={hasUpvoted}
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
