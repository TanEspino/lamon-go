-- 1. Create table for saved posts (bookmarks)
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Enable RLS for saved_posts
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for saved_posts (drop first if exists to ensure idempotency)
DROP POLICY IF EXISTS "Users can view their own saved posts." ON public.saved_posts;
CREATE POLICY "Users can view their own saved posts." ON public.saved_posts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved posts." ON public.saved_posts;
CREATE POLICY "Users can insert their own saved posts." ON public.saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved posts." ON public.saved_posts;
CREATE POLICY "Users can delete their own saved posts." ON public.saved_posts
  FOR DELETE USING (auth.uid() = user_id);


-- 2. Modify reviews table to support visibility
-- Add visibility column if it doesn't exist
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS visibility text CHECK (visibility IN ('private', 'shared', 'recommended')) DEFAULT 'shared';

-- Drop the old overly-permissive select policy
DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON public.reviews;

-- Create secure RLS Select Policy for reviews (drop first if exists to ensure idempotency):
-- A review is visible to the viewer if:
-- A) The viewer is the author of the post (user_id = auth.uid())
-- B) The review is shared or recommended AND the viewer is a connected Chowmate (status = 'accepted' in buddies table)
DROP POLICY IF EXISTS "Reviews are viewable by owner and buddies." ON public.reviews;
CREATE POLICY "Reviews are viewable by owner and buddies." ON public.reviews
  FOR SELECT USING (
    auth.uid() = user_id OR (
      visibility IN ('shared', 'recommended') AND (
        EXISTS (
          SELECT 1 FROM public.buddies 
          WHERE status = 'accepted' AND (
            (requester_id = auth.uid() AND receiver_id = user_id) OR
            (receiver_id = auth.uid() AND requester_id = user_id)
          )
        )
      )
    )
  );
