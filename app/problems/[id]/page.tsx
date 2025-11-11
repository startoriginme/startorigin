import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemDetail } from "@/components/problem-detail"
import { Button } from "@/components/ui/button"
import { Lightbulb, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: problem, error } = await supabase
    .from("problems")
    .select(`
      *,
      profiles:author_id (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )
    `)
    .eq("id", id)
    .single()

  if (error || !problem) {
    notFound()
  }

  // Получаем пользователя, но не требуем аутентификации
  let user = null
  let hasUpvoted = false

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">StartOrigin</span>
            </Link>
            <Link href="/problems">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Problems
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <ProblemDetail 
          problem={problem} 
          userId={user?.id} 
          initialHasUpvoted={hasUpvoted} 
        />
      </main>
    </div>
  )
}
