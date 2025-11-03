import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemForm } from "@/components/problem-form"
import { Button } from "@/components/ui/button"
import { Lightbulb, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function EditProblemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Fetch problem
  const { data: problem, error } = await supabase
    .from("problems")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .single()

  if (error || !problem) {
    notFound()
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
            <Link href={`/problems/${id}`}>
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Problem
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Edit Problem</h1>
            <p className="text-muted-foreground">Update your problem details</p>
          </div>

          <ProblemForm userId={user.id} initialData={problem} />
        </div>
      </main>
    </div>
  )
}
