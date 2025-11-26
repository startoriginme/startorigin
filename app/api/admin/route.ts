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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { action, data: bodyData } = await request.json()

  try {
    if (action === 'deleteProblem') {
      const { problemId } = bodyData
      
      await supabaseAdmin
        .from('upvotes')
        .delete()
        .eq('problem_id', problemId)

      const { error } = await supabaseAdmin
        .from('problems')
        .delete()
        .eq('id', problemId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'addAlias') {
      const { alias, userId } = bodyData
      
      const { error } = await supabaseAdmin
        .from('user_aliases')
        .insert({
          alias: alias.toLowerCase(),
          user_id: userId
        })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteAlias') {
      const { aliasId } = bodyData
      
      const { error } = await supabaseAdmin
        .from('user_aliases')
        .delete()
        .eq('id', aliasId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'searchUser') {
      const { username } = bodyData
      
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
