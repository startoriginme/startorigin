// app/actions/auth.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function handleLogout() {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error("Error signing out:", error)
      throw error
    }
    
    // Ревалидируем все страницы, которые могут быть затронуты
    revalidatePath("/")
    revalidatePath("/problems")
    revalidatePath("/problems/new")
    revalidatePath("/profile")
    revalidatePath("/projects", "layout")
    
    // Перенаправляем на главную страницу или страницу входа
    redirect("/auth/login")
  } catch (error) {
    console.error("Logout failed:", error)
    // В случае ошибки все равно перенаправляем на главную
    redirect("/")
  }
}
