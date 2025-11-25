import { createClient } from "@/lib/supabase/server"

// Статическая карта алиасов (для fallback)
const staticUserAliases: Record<string, string[]> = {
  "nikolaev": ["maxnikolaev", "maxnklv", "azya", "nklv"],
  "gerxog": ["admin"],
  "startorigin": ["problems"],
  "winter": ["zima", "vlkv", "bolt"]
}

// Функция для получения основного username по алиасу
export async function getMainUsername(username: string): Promise<string> {
  const supabase = await createClient()
  
  // Сначала ищем в базе данных
  const { data: aliasData, error } = await supabase
    .from("user_aliases")
    .select("profiles(username)")
    .eq("alias", username)
    .single()

  if (!error && aliasData?.profiles?.username) {
    return aliasData.profiles.username
  }

  // Если не нашли в базе, используем статическую карту
  for (const [mainUsername, aliases] of Object.entries(staticUserAliases)) {
    if (mainUsername === username || aliases.includes(username)) {
      return mainUsername
    }
  }

  return username
}

// Функция для получения всех username пользователя (основной + алиасы)
export async function getAllUsernames(mainUsername: string, userId?: string): Promise<string[]> {
  const supabase = await createClient()
  const allUsernames: string[] = [mainUsername]

  // Получаем алиасы из базы данных
  if (userId) {
    const { data: dbAliases, error } = await supabase
      .from("user_aliases")
      .select("alias")
      .eq("user_id", userId)

    if (!error && dbAliases) {
      dbAliases.forEach(item => allUsernames.push(item.alias))
    }
  }

  // Добавляем алиасы из статической карты
  const staticAliases = staticUserAliases[mainUsername] || []
  staticAliases.forEach(alias => {
    if (!allUsernames.includes(alias)) {
      allUsernames.push(alias)
    }
  })

  return allUsernames
}

// Функция для получения всех алиасов (для админ-панели)
export async function getAllAliases() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("user_aliases")
    .select(`
      *,
      profiles (
        username,
        display_name
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching aliases:", error)
    return []
  }

  return data || []
}

// Функция для добавления алиаса
export async function addAlias(alias: string, userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("user_aliases")
    .insert({
      alias: alias.toLowerCase(),
      user_id: userId
    })

  return { error }
}

// Функция для удаления алиаса
export async function deleteAlias(aliasId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("user_aliases")
    .delete()
    .eq("id", aliasId)

  return { error }
}
