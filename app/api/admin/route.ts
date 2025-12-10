// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  try {
    if (action === 'getProblems') {
      const { data, error } = await supabaseAdmin
        .from('problems')
        .select('*, profiles(id, username, display_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'getAliases') {
      const { data, error } = await supabaseAdmin
        .from('user_aliases')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }

    if (action === 'getUserBadges') {
      const { data, error } = await supabaseAdmin
        .from('user_badges')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })

      if (error) {
        // Если таблицы нет, создадим ее позже
        console.log('User badges table might not exist yet')
        return NextResponse.json([])
      }
      return NextResponse.json(data || [])
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { action, data: bodyData } = await request.json()

  try {
    // 1. Поиск пользователя
    if (action === 'searchUser') {
      const { username } = bodyData
      
      // Сначала ищем в основных профилях
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()

      if (!profileError && profileData) {
        return NextResponse.json(profileData)
      }

      // Если не нашли в основных профилях, ищем в алиасах
      const { data: aliasData, error: aliasError } = await supabaseAdmin
        .from('user_aliases')
        .select('user_id')
        .eq('alias', username.toLowerCase())
        .single()

      if (!aliasError && aliasData) {
        // Получаем профиль пользователя по user_id
        const { data: userData, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', aliasData.user_id)
          .single()

        if (!userError && userData) {
          return NextResponse.json(userData)
        }
      }

      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Добавление алиаса
    if (action === 'addAlias') {
      const { alias, userId } = bodyData
      
      // Проверяем, существует ли уже такой алиас
      const { data: existingAlias, error: checkError } = await supabaseAdmin
        .from('user_aliases')
        .select('id')
        .eq('alias', alias.toLowerCase())
        .single()

      if (!checkError && existingAlias) {
        return NextResponse.json({ error: 'Alias already exists' }, { status: 400 })
      }

      // Проверяем, не занят ли username в основных профилях
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', alias.toLowerCase())
        .single()

      if (!profileCheckError && existingProfile) {
        return NextResponse.json({ error: 'Username already taken as main profile' }, { status: 400 })
      }

      const { data, error } = await supabaseAdmin
        .from('user_aliases')
        .insert({
          alias: alias.toLowerCase(),
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // 3. Удаление алиаса
    if (action === 'deleteAlias') {
      const { aliasId } = bodyData
      
      const { error } = await supabaseAdmin
        .from('user_aliases')
        .delete()
        .eq('id', aliasId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 4. Добавление значка
    if (action === 'addBadge') {
      const { userId, badge_type } = bodyData

      // Сначала проверяем, существует ли таблица user_badges
      const { data: tableExists } = await supabaseAdmin
        .from('user_badges')
        .select('id')
        .limit(1)

      if (!tableExists) {
        // Создаем таблицу если она не существует
        console.log('Creating user_badges table...')
        // Таблица будет создана через Supabase SQL Editor
        return NextResponse.json({ error: 'Badges table not set up yet' }, { status: 500 })
      }

      // Проверяем, есть ли уже такой значок у пользователя
      const { data: existingBadge, error: checkError } = await supabaseAdmin
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_type', badge_type)
        .single()

      if (!checkError && existingBadge) {
        return NextResponse.json({ error: 'User already has this badge' }, { status: 400 })
      }

      const { data: badge, error } = await supabaseAdmin
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_type: badge_type,
          created_by: 'admin'
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(badge)
    }

    // 5. Удаление значка
    if (action === 'deleteBadge') {
      const { badgeId } = bodyData
      
      const { error } = await supabaseAdmin
        .from('user_badges')
        .delete()
        .eq('id', badgeId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // 6. Удаление проблемы
    if (action === 'deleteProblem') {
      const { problemId } = bodyData
      
      // Сначала удаляем апвоуты
      await supabaseAdmin
        .from('upvotes')
        .delete()
        .eq('problem_id', problemId)

      // Затем удаляем проблему
      const { error } = await supabaseAdmin
        .from('problems')
        .delete()
        .eq('id', problemId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Admin POST error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
