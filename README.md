
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
2.  Go to **Authentication > URL Configuration**:
    - Set **Site URL** to `http://localhost:3000` (for local dev) or your Vercel domain (for production)
3.  Go to **Authentication > Providers** and enable Google OAuth:
    - Toggle **Enable** to ON
    - Enter your **Google OAuth Client ID** and **Client Secret** from Google Cloud Console
    - **Important**: In Google Cloud Console, add this redirect URI: `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
4.  Go to the **SQL Editor** in Supabase and run the content of `supabase/schema.sql`. This sets up the `bookmarks` table and Row Level Security (RLS) policies.

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

### Google OAuth Configuration - Redirect URI Mismatch
**Problem**: Encountered `Error 400: redirect_uri_mismatch` when attempting to sign in with Google. The error indicated that the redirect URI sent to Google didn't match what was configured in Google Cloud Console.

**Solution**: The issue was understanding the OAuth flow with Supabase. When using Supabase OAuth, Google needs to authorize Supabase's callback URL, not your app's callback URL directly. The correct redirect URI to add in Google Cloud Console is:
```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```
After adding this exact URL to the Authorized Redirect URIs in Google Cloud Console, the OAuth flow worked correctly. Supabase then handles redirecting back to your app's callback URL (`/auth/callback`).

### Google OAuth Provider Not Enabled
**Problem**: Initially received `"Unsupported provider: provider is not enabled"` error when clicking "Sign in with Google".

**Solution**: This was a configuration issue in the Supabase dashboard. The Google provider needed to be explicitly enabled:
1. Navigate to Supabase Dashboard → Authentication → Providers
2. Click on Google provider
3. Toggle "Enable" to ON
4. Enter Google OAuth Client ID and Client Secret from Google Cloud Console
5. Save the configuration

Additionally, ensure the Site URL in Supabase (Authentication → URL Configuration) is set to your app's URL (`http://localhost:3000` for local development).

### Production Deployment - Redirect to Localhost Issue
**Problem**: After deploying to Vercel, OAuth authentication was redirecting users to `http://localhost:3000` instead of the production Vercel domain, causing authentication failures.

**Solution**: The Supabase Site URL was still configured for localhost. Fixed by updating Supabase Dashboard → Authentication → URL Configuration:
- Changed **Site URL** from `http://localhost:3000` to the production Vercel domain: `https://smart-bookmarks-zeta.vercel.app`
- Added the production callback URL to **Redirect URLs** (if available): `https://smart-bookmarks-zeta.vercel.app/auth/callback`

**Important**: For environments where you need both localhost and production to work, you can:
- Keep the Supabase Site URL set to production (Vercel domain)
- Use separate Supabase projects for development and production, OR
- Manually switch the Site URL when testing locally (not recommended for frequent switching)

### Real-time Synchronization
**Problem**: Ensuring the bookmark list updates instantly across multiple tabs while maintaining server-side rendering (SSR) benefits.

**Solution**: Used a hybrid approach. The initial state uses SSR data for speed and SEO. A client-side `useEffect` subscribes to Supabase Realtime channels to listen for `INSERT` and `DELETE` events, updating the local state optimistically. The Realtime subscription respects Row Level Security (RLS) policies, so users only receive updates for their own bookmarks.

### Authentication Middleware
**Problem**: Securely protecting routes while allowing OAuth redirects to pass through.

**Solution**: Implemented a robust `middleware.ts` using `@supabase/ssr`'s `createServerClient`. This manages the session refresh token flow and redirects unauthenticated users away from protected routes, while excluding public paths (`/login`, `/auth/*`) and static assets. The middleware also handles redirecting authenticated users away from the login page.

### Next.js 15 Cookie Handling
**Problem**: Next.js 15 introduced async `cookies()`, which broke the server-side Supabase client initialization.

**Solution**: Refactored `lib/supabase/server.ts` to `await cookies()` before accessing the cookie store, ensuring compatibility with the latest Next.js patterns. This change was necessary because the `cookies()` function is now asynchronous in Next.js 15+.

### Row Level Security (RLS) Policies
**Problem**: Ensuring users can only access their own bookmarks while allowing real-time subscriptions to work correctly.

**Solution**: Created comprehensive RLS policies in `supabase/schema.sql`:
- Separate policies for SELECT, INSERT, UPDATE, and DELETE operations
- All policies use `auth.uid() = user_id` to ensure users can only access their own data
- RLS automatically filters real-time subscriptions, so users only receive events for their own bookmarks
- The policies are applied at the database level, providing security even if application code has bugs

## Deployment to Vercel

1.  Push code to GitHub.
2.  Import project in Vercel.
3.  Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4.  **Important**: Update Supabase Site URL:
    - Go to Supabase Dashboard → Authentication → URL Configuration
    - Change **Site URL** from `http://localhost:3000` to your Vercel domain (e.g., `https://smart-bookmarks-zeta.vercel.app`)
    - Add your production callback URL to **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`
5.  Deploy!
