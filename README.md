
# Smart Bookmark

A real-time bookmark manager built with **Next.js 14+ (App Router)**, **Supabase**, and **Tailwind CSS**.

## Features

- **Google OAuth Authentication**: Secure sign-up/login.
- **Private Bookmarks**: Each user has their own private list.
- **Real-time Updates**: Changes reflect instantly across tabs/devices without refresh.
- **Responsive UI**: Modern, glassmorphism-inspired design.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd smart-bookmark-app
npm install
```

### 2. Supabase Configuration
1.  Create a new project on [Supabase](https://supabase.com).
2.  Go to **Authentication > Providers** and correct Google OAuth credentials.
    - **Authorized Redirect URI**: `https://<your-vercel-domain>/auth/callback` (or `http://localhost:3000/auth/callback` for local dev).
3.  Go to the **SQL Editor** in Supabase and run the content of `supabase/schema.sql`. This sets up the `bookmarks` table and Row Level Security (RLS) policies.

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Update it with your Supabase keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally
```bash
npm run dev
```
Visit `http://localhost:3000`.

## Challenges & Solutions

### Real-time Synchronization
**Problem**: Ensuring the bookmark list updates instantly across multiple tabs while maintaining server-side rendering (SSR) benefits.
**Solution**: Used a hybrid approach. The initial state uses SSR data for speed and SEO. A client-side `useEffect` subscribes to Supabase Realtime channels to listen for `INSERT` and `DELETE` events, updating the local state optimistically.

### Authentication Middleware
**Problem**: Securely protecting identifying routes while allowing OAuth redirects.
**Solution**: Implemented a robust `middleware.ts` using `@supabase/ssr`'s `createServerClient`. This manages the session refresh token flow and redirects unauthenticated users away from protected routes, while excluding public paths and static assets.

### Next.js 15 Cookie Handling
**Problem**: Next.js 15 introduced async `cookies()`, which required updating the server-side client initialization.
**Solution**: Refactored `lib/supabase/server.ts` to `await cookies()` before accessing the store, ensuring compatibility with the latest Next.js patterns.

## Deployment to Vercel

1.  Push code to GitHub.
2.  Import project in Vercel.
3.  Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4.  Deploy!
