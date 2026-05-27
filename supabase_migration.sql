-- ====================================================================
-- LAMONGO DATABASE MIGRATION: CHOWMATE CONSENSUS RATING ENGINE
-- Copy and run this script in your Supabase project's SQL Editor.
-- ====================================================================

-- 1. Create the consensus_ratings table (stores individual buddy reviews)
create table if not exists public.consensus_ratings (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.reviews(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment varchar(50),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id) -- A user can only rate a dish once per post
);

-- 2. Enable Row-Level Security (RLS)
alter table public.consensus_ratings enable row level security;

-- 3. Setup RLS Policies for secure read/write access
drop policy if exists "Consensus ratings are viewable by everyone" on public.consensus_ratings;
create policy "Consensus ratings are viewable by everyone" 
  on public.consensus_ratings for select using (true);

drop policy if exists "Users can insert their own consensus rating" on public.consensus_ratings;
create policy "Users can insert their own consensus rating" 
  on public.consensus_ratings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own consensus rating" on public.consensus_ratings;
create policy "Users can update their own consensus rating" 
  on public.consensus_ratings for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own consensus rating" on public.consensus_ratings;
create policy "Users can delete their own consensus rating" 
  on public.consensus_ratings for delete using (auth.uid() = user_id);

-- 4. Add pre-calculated stats columns to the reviews table (denormalization)
alter table public.reviews 
  add column if not exists consensus_average numeric default 0.0,
  add column if not exists consensus_count integer default 0;

-- 5. Create the database trigger function to automatically compute stats on the fly
create or replace function public.update_review_consensus_stats()
returns trigger as $$
declare
  new_avg numeric;
  new_count integer;
  target_post_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);

  -- Recalculate average (rounded to 1 decimal place) and count
  select 
    coalesce(round(avg(rating), 1), 0.0),
    count(*)
  into new_avg, new_count
  from public.consensus_ratings
  where post_id = target_post_id;

  -- Atomically update the parent review record
  update public.reviews
  set 
    consensus_average = new_avg,
    consensus_count = new_count
  where id = target_post_id;

  return null;
end;
$$ language plpgsql security definer;

-- 6. Bind the trigger to run on any inserts, updates, or deletes
drop trigger if exists on_consensus_rating_changed on public.consensus_ratings;
create trigger on_consensus_rating_changed
  after insert or update or delete
  on public.consensus_ratings
  for each row execute procedure public.update_review_consensus_stats();
