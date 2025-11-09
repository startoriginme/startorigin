"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")
  }

  const display_name = formData.get("display_name") as string
  const username = formData.get("username") as string
  const bio = formData.get("bio") as string

  try {
    // Validate username format
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, and underscores")
    }

    // Проверяем, не занят ли username другим пользователем
    if (username) {
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .neq("id", user.id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw new Error(`Check failed: ${checkError.message}`)
      }

      if (existingProfile) {
        throw new Error("This username is already taken. Please choose another one.")
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: display_name || null,
        username: username || null,
        bio: bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      if (updateError.code === "23505") {
        throw new Error("This username is already taken. Please choose another one.")
      }
      throw new Error(`Database error: ${updateError.message}`)
    }

    // Revalidate all pages that might display the profile
    revalidatePath("/profile")
    revalidatePath("/")
    revalidatePath("/problems/[id]", "page")

  } catch (error) {
    // Перенаправляем обратно на страницу редактирования с ошибкой
    redirect(`/profile/edit?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`)
  }

  redirect("/profile")
}
