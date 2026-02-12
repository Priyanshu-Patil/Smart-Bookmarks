-- Create the table for bookmarks
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table bookmarks enable row level security;

-- Create policies
-- Note: Using separate policies for each operation is safer and more explicit

-- Policy: Allow users to insert their own bookmarks
create policy "Users can insert their own bookmarks"
  on bookmarks for insert
  with check ( auth.uid() = user_id );

-- Policy: Allow users to view their own bookmarks
create policy "Users can view their own bookmarks"
  on bookmarks for select
  using ( auth.uid() = user_id );

-- Policy: Allow users to update their own bookmarks
create policy "Users can update their own bookmarks"
  on bookmarks for update
  using ( auth.uid() = user_id );

-- Policy: Allow users to delete their own bookmarks
create policy "Users can delete their own bookmarks"
  on bookmarks for delete
  using ( auth.uid() = user_id );

-- Important: Drop the generic "Users can modify their own bookmarks" policy if separate ones are used to avoid conflicts.
-- I'll use the specific policies for clarity and safety.
-- To clean up existing policies if re-running:
-- drop policy if exists "Users can modify their own bookmarks" on bookmarks;
-- drop policy if exists "Users can insert their own bookmarks" on bookmarks;
-- etc.
