import { createClient } from "@/lib/supabase/server"

export async function getUserAliases(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("user_aliases")
    .select("alias")
    .eq("user_id", userId)

  if (error) {
    console.error("Error fetching user aliases:", error)
    return []
  }

  return data.map(item => item.alias)
}

export async function getUserByAlias(alias: string) {
  const supabase = await createClient()
  
  // Сначала ищем в таблице алиасов
  const { data: aliasData, error: aliasError } = await supabase
    .from("user_aliases")
    .select("user_id")
    .eq("alias", alias)
    .single()

  if (aliasError || !aliasData) {
    // Если не нашли в алиасах, ищем в основных username
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", alias)
      .single()

    if (profileError || !profileData) {
      return null
    }

    return profileData
  }

  // Если нашли в алиасах, получаем профиль пользователя
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", aliasData.user_id)
    .single()

  if (profileError || !profileData) {
    return null
  }

  return profileData
}

export async function getAllUsernamesForUser(mainUsername: string, userId: string) {
  const aliases = await getUserAliases(userId)
  return [mainUsername, ...aliases]
}
