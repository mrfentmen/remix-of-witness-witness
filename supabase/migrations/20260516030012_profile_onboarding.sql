-- 20260516030012_profile_onboarding.sql
-- Add display_name, avatar_url, account_type, and profile_complete to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'Standard User',
ADD COLUMN IF NOT EXISTS profile_complete boolean DEFAULT false;

-- Add constraint for account_type to match the requested options
-- Note: 'Student' is already in a previous migration's check, but we'll include all 3 here.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_account_type_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_account_type_check 
CHECK (account_type IN ('Standard User', 'Student', 'Journalist or Legal Observer'));
