## Smart Bookmark – Project Workflow

This document explains how the Smart Bookmark app works end‑to‑end: architecture, request flows, auth, database, realtime, and deployment.

---

## 1. High‑Level Architecture

- **Frontend**: Next.js App Router (`app/`), React Server and Client Components, Tailwind CSS.
- **Backend**: Supabase (PostgreSQL, Auth, Realtime) + Next.js server actions and route handlers.
- **Auth**: Google OAuth via Supabase Auth.
- **Data**: `bookmarks` table in Supabase with strict Row Level Security (RLS).
- **Realtime**: Supabase Realtime channel on the `bookmarks` table.
- **Deployment**: Vercel for hosting; environment variables point the app at the Supabase project.

Key design goals:
- All bookmarks are **per‑user and private**.
- UI is **SSR‑first** for fast initial load, with **client‑side realtime** updates.
- Auth is **stateless** on the frontend; Supabase session is stored and refreshed via cookies.

---

## 2. Code Structure Overview

- `app/layout.tsx`
  - Root layout, loads `app/globals.css`, sets fonts (Geist) and base metadata (`Smart Bookmark`).
- `app/page.tsx`
  - Protected home page.
  - Server Component that:
    - Creates a Supabase **server client**.
    - Gets the current user.
    - Redirects to `/login` if unauthenticated.
    - Fetches the user’s bookmarks from Supabase.
    - Renders the header, `AddBookmark` form, and `RealtimeBookmarks` grid.
- `app/login/page.tsx`
  - Client Component.
  - Renders “Sign in with Google” and starts the Supabase OAuth flow.
  - Displays detailed error messages from query parameters on failure.
- `app/auth/callback/route.ts`
  - Route handler for `/auth/callback`.
  - Exchanges OAuth `code` for a Supabase session and redirects to `/` (or `next`).
  - Handles both OAuth and (optionally) email OTP flows.
- `app/auth/signout/route.ts`
  - POST handler for signing out.
  - Calls `supabase.auth.signOut()` and redirects to `/login`.
- `app/actions.ts`
  - Server actions used by Client Components:
    - `addBookmark(formData)`
    - `deleteBookmark(id)`
- `components/AddBookmark.tsx`
  - Client Component with a form to create a bookmark.
  - Calls `addBookmark` server action and resets the form.
- `components/RealtimeBookmarks.tsx`
  - Client Component that:
    - Takes `serverBookmarks` from SSR as initial state.
    - Subscribes to Supabase Realtime for the `bookmarks` table.
    - Handles `INSERT`, `UPDATE`, and `DELETE` events to keep UI in sync.
- `lib/supabase/server.ts`
  - Factory for Supabase **server client** using `@supabase/ssr` + async `cookies()`.
- `lib/supabase/client.ts`
  - Factory for Supabase **browser client** using `@supabase/ssr`’s `createBrowserClient`.
- `lib/supabase/middleware.ts` + `middleware.ts`
  - Middleware that keeps Supabase sessions fresh and protects routes.
- `supabase/schema.sql`
  - SQL migrations for the `bookmarks` table + RLS policies.
- `README.md`
  - Setup, configuration, deployment, and challenges/solutions.

---

## 3. Authentication Workflow (Google + Supabase)

### 3.1 Login Flow

1. User visits `/login` (public route).
2. `LoginPage` renders a button that calls:
   ```ts
   supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo: `${location.origin}/auth/callback` },
   })
   ```
3. Supabase redirects the user to Google’s OAuth consent screen.
4. After the user approves, Google redirects **back to Supabase** at:
   - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
5. Supabase:
   - Validates the Google response.
   - Creates/updates the user in `auth.users`.
   - Creates a session and sets auth cookies.
   - Redirects the user to the app callback:
     - `${SITE_URL}/auth/callback?code=...&state=...`

### 3.2 App Callback Handler

- `app/auth/callback/route.ts`:
  1. Reads the `code` (or `token_hash`) from query params.
  2. Creates a **server client** (`createClient()`).
  3. Calls `supabase.auth.exchangeCodeForSession(code)`.
  4. On success:
     - Supabase session cookies are written via the SSR helper.
     - User is redirected to `next` (default `/`).
  5. On error:
     - Logs the error and redirects back to `/login?error=auth&message=...`.

### 3.3 Auth‑Aware Middleware

- `middleware.ts → updateSession`:
  - Runs for most routes (except static assets, images, favicon, etc.).
  - Creates a Supabase **server client** on each request using the incoming cookies.
  - Calls `supabase.auth.getUser()`:
    - If **no user** and path is **not** `/login` or `/auth/*`:
      - Redirects to `/login`.
    - If **user exists** and path **is** `/login`:
      - Redirects to `/`.
  - Ensures server components always see a fresh session.

### 3.4 Signout Flow

- Home page contains:
  - `<form action="/auth/signout" method="post">`.
- `app/auth/signout/route.ts`:
  - Creates server client and calls `supabase.auth.signOut()`.
  - Revalidates `/` and redirects to `/login`.

---

## 4. Data Model & Security (RLS)

### 4.1 `bookmarks` Table

Defined in `supabase/schema.sql`:

- Columns:
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid references auth.users not null`
  - `title text not null`
  - `url text not null`
  - `created_at timestamptz default now() at time zone 'utc'`

### 4.2 Row Level Security

RLS is enabled and policies ensure each user only sees/changes their own data:

- **INSERT** – user can insert rows where `auth.uid() = user_id`.
- **SELECT** – user can read rows where `auth.uid() = user_id`.
- **UPDATE** – user can update rows where `auth.uid() = user_id`.
- **DELETE** – user can delete rows where `auth.uid() = user_id`.

Effects:
- `select('*')` *without any extra filters* automatically returns only the logged‑in user’s bookmarks.
- Realtime subscriptions also respect RLS: each client only receives events for rows it’s allowed to see.

---

## 5. Bookmark CRUD Workflow

### 5.1 Fetch Bookmarks (Home Page)

File: `app/page.tsx` (Server Component)

1. Creates server client:
   - Uses `@supabase/ssr` + async `cookies()` to bind to request cookies.
2. Calls `supabase.auth.getUser()`:
   - If no user → `redirect('/login')`.
3. Queries bookmarks:
   ```ts
   const { data: bookmarks } = await supabase
     .from('bookmarks')
     .select('*')
     .order('created_at', { ascending: false })
   ```
   - RLS ensures only that user’s rows are returned.
4. Renders:
   - Header with user avatar/email and sign‑out button.
   - `AddBookmark` form.
   - `RealtimeBookmarks` with `serverBookmarks` prop (SSR data).

### 5.2 Add Bookmark

Files: `components/AddBookmark.tsx`, `app/actions.ts`

**Client side (`AddBookmark`)**
- Renders a form with `title` and `url` fields.
- Uses a server action as `form.action`:
  ```tsx
  <form
    action={async (formData) => {
      await addBookmark(formData)
      formRef.current?.reset()
    }}
  >
  ```
- Uses `useFormStatus` to show a loading state while the server action runs.

**Server side (`addBookmark`)**
- Validates inputs:
  - Checks both `title` and `url` exist.
- Checks auth:
  - `supabase.auth.getUser()` must return a user.
- Inserts row:
  ```ts
  await supabase.from('bookmarks').insert({
    title,
    url,
    user_id: user.id,
  })
  ```
- Calls `revalidatePath('/')` so the home page’s server data can refresh if needed.

**Realtime effect**
- Because Realtime is enabled on `bookmarks`, an `INSERT` event is broadcast.
- Any open clients subscribed to the Realtime channel receive the new bookmark and update their UI.

### 5.3 Delete Bookmark

Files: `components/RealtimeBookmarks.tsx`, `app/actions.ts`

**Client side (`RealtimeBookmarks`)**
- Each bookmark card has a delete button:
  - Calls `handleDelete(id)` on click.
- `handleDelete`:
  - Performs an **optimistic update**:
    - Immediately removes the bookmark from component state.
  - Calls `deleteBookmark(id)` server action.
  - If the server reports an error:
    - Logs it and calls `router.refresh()` to re‑sync with the server.

**Server side (`deleteBookmark`)**
- Ensures the user is authenticated.
- Executes:
  ```ts
  await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  ```
  - The additional `eq('user_id', user.id)` prevents users from deleting others’ bookmarks, even before RLS.
- Calls `revalidatePath('/')`.

**Realtime effect**
- A `DELETE` event from Supabase causes all subscribed clients to remove the deleted bookmark from their state.

---

## 6. Realtime Workflow

File: `components/RealtimeBookmarks.tsx`

1. Initializes state with `serverBookmarks` (from SSR).
2. On mount:
   - Creates a Supabase browser client via `createClient()`.
   - Subscribes to:
     ```ts
     supabase
       .channel('realtime bookmarks')
       .on('postgres_changes', {
         event: '*',
         schema: 'public',
         table: 'bookmarks',
       }, handler)
       .subscribe()
     ```
3. Event handler behavior:
   - **INSERT**:
     - Casts `payload.new` to `Bookmark`.
     - Prepends it to state if it’s not already there.
   - **UPDATE**:
     - Replaces the bookmark in state with the updated version.
   - **DELETE**:
     - Removes the bookmark with `payload.old.id` from state.
4. On unmount:
   - Calls `supabase.removeChannel(channel)` to clean up.

Because RLS is enforced on Realtime streams, each user only receives events for their own bookmarks.

---

## 7. Middleware & Session Management

Files: `lib/supabase/middleware.ts`, `middleware.ts`

- `updateSession(request: NextRequest)`:
  - Wraps the request in a `NextResponse.next()` object.
  - Creates a Supabase server client with custom cookie handlers:
    - `getAll` reads cookies from the incoming request.
    - `setAll` writes cookies into both the request and the outgoing response, keeping sessions fresh.
  - Calls `supabase.auth.getUser()` to:
    - Protect non‑public routes.
    - Redirect logged‑in users away from `/login`.

This middleware ensures:
- SSR routes always see the correct auth state.
- Sessions are silently refreshed when needed.

---

## 8. Environment & Deployment Workflow

### 8.1 Local Development

1. Create Supabase project, run `supabase/schema.sql`.
2. Set Supabase:
   - Site URL: `http://localhost:3000`
   - Provider: Google enabled with correct Client ID/Secret.
   - Google Cloud Console redirect URI:
     - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
3. `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<supabase-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   ```
4. `npm run dev` and visit `http://localhost:3000`.

### 8.2 Production (Vercel)

1. Push code to GitHub.
2. Import repo in Vercel.
3. Configure environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. In Supabase:
   - Site URL: `https://smart-bookmarks-zeta.vercel.app` (or your domain).
   - Redirect URLs: `https://smart-bookmarks-zeta.vercel.app/auth/callback`.
5. In Google Cloud Console:
   - Keep the Supabase callback URI:
     - `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
6. Deploy from Vercel dashboard.

---

## 9. Error Handling & Debugging Notes

- **Auth errors**:
  - `/auth/callback` logs detailed errors and redirects with query params.
  - `/login` reads those params and shows a user‑friendly error.
- **Common misconfigurations** (all documented in `README.md`):
  - Google provider not enabled in Supabase.
  - Missing/incorrect redirect URI in Google Cloud Console.
  - Supabase `Site URL` pointing to `localhost` in production.
  - Leading/trailing spaces in URLs in Supabase’s URL Configuration (can cause 500s).
- **Database issues**:
  - If RLS or schema is wrong, bookmark queries will fail; fix by re‑running `supabase/schema.sql`.

This workflow should give you a complete mental model of how requests travel through the system—from the browser, through Next.js and middleware, into Supabase Auth and Postgres, and back out to the user interface with realtime updates.

