
'use client'

import { createClient } from '@/lib/supabase/client'
import { Bookmark } from '@/types'
import { useEffect, useState } from 'react'
import { deleteBookmark } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface RealtimeBookmarksProps {
  serverBookmarks: Bookmark[]
}

export default function RealtimeBookmarks({ serverBookmarks }: RealtimeBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(serverBookmarks)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    setBookmarks(serverBookmarks)
  }, [serverBookmarks])

  useEffect(() => {
    const channel = supabase
      .channel('realtime bookmarks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBookmark = payload.new as Bookmark
            setBookmarks((prev) => {
              if (prev.find((b) => b.id === newBookmark.id)) {
                return prev
              }
              return [newBookmark, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setBookmarks((prev) => prev.filter((b) => b.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
             const updatedBookmark = payload.new as Bookmark
             setBookmarks((prev) => prev.map((b) => b.id === updatedBookmark.id ? updatedBookmark : b))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleDelete = async (id: string) => {
    // Optimistic update
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
    const result = await deleteBookmark(id)
    if (result.error) {
       // Revert if error (fetching from server effectively reverts because prop changes or simple reload)
       // For now, simpler to just log error or toast
       console.error(result.error)
       router.refresh()
    }
  }

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-lg transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-black/20"
        >
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl transition-all group-hover:bg-indigo-500/30" />
          
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={bookmark.title}>
                {bookmark.title}
              </h3>
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-500 hover:text-indigo-400 break-all line-clamp-2"
              >
                {bookmark.url}
              </a>
            </div>
            
            <div className="mt-4 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => handleDelete(bookmark.id)}
                className="rounded-full bg-red-500/10 p-2 text-red-500 hover:bg-red-500/20 transition-colors"
                title="Delete bookmark"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
      
      {bookmarks.length === 0 && (
         <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
           <p className="text-gray-500 dark:text-gray-400">No bookmarks yet. Add one above!</p>
         </div>
      )}
    </div>
  )
}
