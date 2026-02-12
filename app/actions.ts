
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addBookmark(formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string
  const url = formData.get('url') as string

  if (!title || !url) {
    return { error: 'Title and URL are required' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to add a bookmark' }
  }

  const { error } = await supabase.from('bookmarks').insert({
    title,
    url,
    user_id: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteBookmark(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to delete a bookmark' }
  }

  const { error } = await supabase.from('bookmarks').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}
