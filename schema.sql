-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  bio text,
  expo_push_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create a table for reviews (posts)
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  restaurant_name text not null,
  restaurant_id text,
  dish_name text not null,
  rating numeric not null,
  price numeric,
  currency text default 'PHP',
  caption text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for reviews
alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone." on public.reviews
  for select using (true);

create policy "Users can insert their own reviews." on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own reviews." on public.reviews
  for update using (auth.uid() = user_id);
  
create policy "Users can delete their own reviews." on public.reviews
  for delete using (auth.uid() = user_id);

-- Create a storage bucket for images
insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true);

create policy "Images are publicly accessible." on storage.objects
  for select using (bucket_id = 'review-images');

create policy "Anyone can upload an image." on storage.objects
  for insert with check (bucket_id = 'review-images');

-- Set up an automatic trigger to create a profile when a new user signs in via Google
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a table for food buddies (friendships)
create table public.buddies (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(requester_id, receiver_id) -- Prevent duplicate requests between same users
);

-- Set up RLS for buddies
alter table public.buddies enable row level security;

-- Users can view their own buddy relationships (either requester or receiver)
create policy "Users can view own buddy relationships." on public.buddies
  for select using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Users can insert a request as the requester
create policy "Users can insert buddy requests." on public.buddies
  for insert with check (auth.uid() = requester_id);

-- Users can update the status if they are the receiver (to accept/reject)
create policy "Receivers can update buddy status." on public.buddies
  for update using (auth.uid() = receiver_id);

-- Users can delete a relationship if they are part of it (unfriend or cancel request)
create policy "Users can delete own buddy relationships." on public.buddies
  for delete using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Enable real-time replication for buddies table (run this in your Supabase SQL Editor if real-time updates are not broadcasting)
-- alter publication supabase_realtime add table public.buddies;
