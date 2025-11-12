import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// УДАЛИТЬ эту строку если она есть:
// export const dynamic = "force-static"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to problems page after successful authentication
  return NextResponse.redirect(`${origin}/problems`)
}
