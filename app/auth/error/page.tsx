import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BriefcaseBusiness, AlertCircle } from "lucide-react"

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <BriefcaseBusiness className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">StartOrigin</span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {params?.error ? (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive font-medium">{params.error}</p>
                {params.error_description && (
                  <p className="text-sm text-destructive/80 mt-1">{params.error_description}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                An unexpected error occurred during authentication.
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Link href="/auth/login" className="w-full">
                <Button className="w-full">Try Again</Button>
              </Link>
              <Link href="/" className="w-full">
                <Button variant="ghost" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
