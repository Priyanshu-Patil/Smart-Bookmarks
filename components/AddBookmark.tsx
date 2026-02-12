
'use client'

import { addBookmark } from '@/app/actions'
import { useFormStatus } from 'react-dom'
import { useRef } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800 transition-all active:scale-95"
    >
      {pending ? (
        <>
          <svg className="mr-3 h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Saving...
        </>
      ) : (
        'Add Bookmark'
      )}
    </button>
  )
}

export default function AddBookmark() {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addBookmark(formData)
        formRef.current?.reset()
      }}
      className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white/50 p-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/50 shadow-sm"
    >
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
            placeholder="e.g. My Favorite Blog"
            required
          />
        </div>
        <div>
          <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            URL
          </label>
          <input
            type="url"
            id="url"
            name="url"
            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
            placeholder="https://example.com"
            required
          />
        </div>
      </div>
      <div className="text-right">
        <SubmitButton />
      </div>
    </form>
  )
}
