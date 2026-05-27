-- ====================================================================
-- LAMONGO DATABASE MIGRATION: PERSISTENT NOTIFICATION ENGINE
-- Copy and run this script in your Supabase project's SQL Editor.
-- ====================================================================

-- 1. Create notifications table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  notifier_id uuid references public.profiles(id) on delete cascade not null,
  type text check (type in ('pending', 'accepted', 'recommended')) not null,
  reference_id uuid not null,
  dish_name text,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Setup secure RLS policies (drop first if exists to ensure idempotency)
drop policy if exists "Users can view own notifications." on public.notifications;
create policy "Users can view own notifications." on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications." on public.notifications;
create policy "Users can update own notifications." on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own notifications." on public.notifications;
create policy "Users can delete own notifications." on public.notifications
  for delete using (auth.uid() = user_id);

-- Enable real-time for notifications table (make sure notifications broadcasts over WebSockets)
alter publication supabase_realtime add table public.notifications;

-- 2. Trigger function to handle buddy relationships -> notifications
create or replace function public.handle_buddy_notification()
returns trigger as $$
begin
  -- Insert a pending request notification
  if (TG_OP = 'INSERT' and new.status = 'pending') then
    insert into public.notifications (user_id, notifier_id, type, reference_id)
    values (new.receiver_id, new.requester_id, 'pending', new.id);
    
  -- Update: Buddy request accepted -> Insert connection notification and delete pending notification
  elsif (TG_OP = 'UPDATE' and new.status = 'accepted' and old.status = 'pending') then
    -- Delete pending request notification
    delete from public.notifications 
    where reference_id = new.id and type = 'pending';
    
    -- Insert accepted connection notification for requester
    insert into public.notifications (user_id, notifier_id, type, reference_id)
    values (new.requester_id, new.receiver_id, 'accepted', new.id);

  -- Update: Buddy request rejected -> Delete pending request notification
  elsif (TG_OP = 'UPDATE' and new.status = 'rejected' and old.status = 'pending') then
    delete from public.notifications 
    where reference_id = new.id and type = 'pending';
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for inserting/updating buddy notification
drop trigger if exists on_buddy_changed on public.buddies;
create trigger on_buddy_changed
  after insert or update on public.buddies
  for each row execute procedure public.handle_buddy_notification();

-- Trigger function to delete buddy notifications on buddy record delete
create or replace function public.handle_buddy_delete_notification()
returns trigger as $$
begin
  delete from public.notifications where reference_id = old.id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_buddy_deleted on public.buddies;
create trigger on_buddy_deleted
  before delete on public.buddies
  for each row execute procedure public.handle_buddy_delete_notification();

-- 3. Trigger function to handle recommended reviews -> notifications
create or replace function public.handle_review_recommendation_notification()
returns trigger as $$
declare
  buddy_record record;
begin
  -- INSERT or UPDATE to recommended: Send notifications to all accepted buddies of review author
  if ((TG_OP = 'INSERT' and new.visibility = 'recommended') or 
      (TG_OP = 'UPDATE' and new.visibility = 'recommended' and (old.visibility is null or old.visibility != 'recommended'))) then
    
    for buddy_record in 
      select case when requester_id = new.user_id then receiver_id else requester_id end as buddy_id
      from public.buddies
      where status = 'accepted' and (requester_id = new.user_id or receiver_id = new.user_id)
    loop
      insert into public.notifications (user_id, notifier_id, type, reference_id, dish_name)
      values (buddy_record.buddy_id, new.user_id, 'recommended', new.id, new.dish_name);
    end loop;

  -- UPDATE where visibility changes away from recommended: Delete notifications
  elsif (TG_OP = 'UPDATE' and old.visibility = 'recommended' and new.visibility != 'recommended') then
    delete from public.notifications where reference_id = new.id and type = 'recommended';
    
  -- UPDATE to update dish name on active recommendation notifications
  elsif (TG_OP = 'UPDATE' and old.visibility = 'recommended' and new.visibility = 'recommended' and old.dish_name != new.dish_name) then
    update public.notifications 
    set dish_name = new.dish_name 
    where reference_id = new.id and type = 'recommended';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger for inserting/updating reviews notification
drop trigger if exists on_review_recommendation_changed on public.reviews;
create trigger on_review_recommendation_changed
  after insert or update on public.reviews
  for each row execute procedure public.handle_review_recommendation_notification();

-- Trigger function to delete review notifications on review deletion
create or replace function public.handle_review_delete_notification()
returns trigger as $$
begin
  delete from public.notifications where reference_id = old.id and type = 'recommended';
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_review_deleted on public.reviews;
create trigger on_review_deleted
  before delete on public.reviews
  for each row execute procedure public.handle_review_delete_notification();

-- 4. 30-Day Database Retention Policy via pg_cron
-- Ensure pg_cron extension is enabled in the database
create extension if not exists pg_cron;

-- Schedule job to clean up older notifications daily at midnight
select cron.schedule(
  'purge-old-notifications-daily',
  '0 0 * * *', -- Everyday at 00:00 (Midnight) UTC
  $$ delete from public.notifications where created_at < now() - interval '30 days' $$
);

-- Backup Failsafe: Function to call manually or via trigger if pg_cron is not enabled/supported
create or replace function public.purge_expired_notifications()
returns void as $$
begin
  delete from public.notifications where created_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;
