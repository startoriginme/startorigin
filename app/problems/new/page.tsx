import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProblemForm } from "@/components/problem-form"
import { Button } from "@/components/ui/button"
import { BriefcaseBusiness, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NewProblemPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BriefcaseBusiness className="h-6 w-6 text-primary" />
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
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">Share a Problem</h1>
            <p className="text-muted-foreground">
              Describe a challenge you&apos;re facing. Be specific and provide context to help others understand the
              problem.
            </p>
          </div>

          <ProblemForm userId={user.id} />
        </div>
      </main>
    </div>
  )
}
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
