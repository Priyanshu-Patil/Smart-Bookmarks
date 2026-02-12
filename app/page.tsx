
import { createClient } from '@/lib/supabase/server'
import AddBookmark from '@/components/AddBookmark'
import RealtimeBookmarks from '@/components/RealtimeBookmarks'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Smart Bookmarks
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Manage your private collection in real-time.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                {user.user_metadata.avatar_url && (
                   <img src={user.user_metadata.avatar_url} alt="User Avatar" className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-700" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block">
                  {user.email}
                </span>
             </div>
             <form action="/auth/signout" method="post">
                <button
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition"
                >
                  Sign Out
                </button>
             </form>
          </div>
        </header>

        <section className="space-y-8">
          <AddBookmark />
          <RealtimeBookmarks serverBookmarks={bookmarks || []} />
        </section>
      </div>
    </main>
  )
}
