"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "User not authenticated" }
  }

  const display_name = formData.get("display_name") as string
  const username = formData.get("username") as string
  const bio = formData.get("bio") as string

  try {
    // ✅ НОРМАЛИЗАЦИЯ USERNAME
    const normalizedUsername = username ? username.toLowerCase().trim() : ""

    // Validate username format
    if (normalizedUsername && !/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return { error: "Username can only contain letters, numbers, and underscores" }
    }

    // Проверяем, не занят ли username другим пользователем
    if (normalizedUsername) {
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", normalizedUsername) // ✅ Сравниваем с нормализованным
        .neq("id", user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        return { error: `Check failed: ${checkError.message}` }
      }

      if (existingProfile) {
        return { error: "This username is already taken. Please choose another one." }
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: display_name || null,
        username: normalizedUsername || null, // ✅ Сохраняем нормализованный
        bio: bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "This username is already taken. Please choose another one." }
      }
      return { error: `Database error: ${updateError.message}` }
    }

    revalidatePath("/profile")
    revalidatePath("/")
    revalidatePath("/problems/[id]", "page")

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }

  redirect("/profile")
}
