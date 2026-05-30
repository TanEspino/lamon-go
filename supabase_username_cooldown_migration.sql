-- ====================================================================
-- LAMONGO DATABASE MIGRATION: USERNAME VALIDATION & COOLDOWN LIMIT
-- Copy and run this script in your Supabase project's SQL Editor.
-- ====================================================================

-- 1. Add new columns to profiles table for tracking changes and previous usernames
alter table public.profiles 
  add column if not exists last_username_change timestamp with time zone,
  add column if not exists previous_username text;

-- 2. Ensure username has a UNIQUE constraint
-- Note: schema.sql already defines `username text unique`, but let's make sure it's unique by adding a unique constraint if it doesn't already exist.
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add constraint profiles_username_key unique (username);
