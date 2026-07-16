-- Migration: create_profiles_table
-- Version: 20260716142235
-- Description: Creates profiles table that extends auth.users with role,
--              company info, and a trigger to auto-create on signup.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  company_name text,
  role         text NOT NULL CHECK (role IN ('broker', 'carrier', 'shipper')),
  avatar_url   text,
  created_at   timestamptz DEFAULT now()
);

COMMENT ON TABLE  public.profiles           IS 'Extended user profile with freight role and company details.';
COMMENT ON COLUMN public.profiles.role      IS 'Determines which portal the user accesses: broker, carrier, or shipper.';
COMMENT ON COLUMN public.profiles.company_name IS 'Displayed in the sidebar and on load/bid records.';

-- ─── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Brokers can read all profiles (needed to display carrier company names on loads)
CREATE POLICY "profiles_select_brokers"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'broker'
    )
  );

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── Trigger: auto-create profile on auth signup ──────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'shipper')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
