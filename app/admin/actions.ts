"use server"

import { createClient } from "@supabase/supabase-js"

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function adminDeleteProblem(problemId: string, password: string) {
  // Verify admin password
  if (password !== "RealAdminStartOriginModeration") {
    return { success: false, error: "Invalid admin password" }
  }

  try {
    // Delete the problem using service role (bypasses RLS)
    const { error } = await supabaseAdmin.from("problems").delete().eq("id", problemId)

    if (error) {
      console.error("[v0] Error deleting problem:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error("[v0] Unexpected error deleting problem:", err)
    return { success: false, error: "Failed to delete problem" }
  }
}
