-- ARENA: Dynamic Tournament Bracketing Platform Schema
-- Run this in your Supabase SQL Editor to initialize or migrate the database

-- 1. Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  organizer_id TEXT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination')),
  participant_type TEXT NOT NULL DEFAULT 'team' CHECK (participant_type IN ('individual', 'team')),
  capacity_limit INT DEFAULT NULL,
  registration_status TEXT NOT NULL DEFAULT 'open' CHECK (registration_status IN ('open', 'closed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'registration_closed', 'ready', 'in_progress', 'completed', 'cancelled')),
  seeding_method TEXT NOT NULL DEFAULT 'seeded' CHECK (seeding_method IN ('random', 'seeded', 'manual')),
  has_scoring BOOLEAN NOT NULL DEFAULT true,
  champion_id TEXT DEFAULT NULL,
  banner_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Participants Table
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id TEXT,
  display_name TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('individual', 'team')),
  seed INT DEFAULT NULL,
  registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('confirmed', 'pending', 'withdrawn')),
  roster TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  bracket_type TEXT DEFAULT 'winners' CHECK (bracket_type IN ('winners', 'losers', 'grand_finals')),
  round_number INT NOT NULL,
  match_position INT NOT NULL,
  participant_a_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  participant_b_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  winner_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  next_match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,
  next_match_slot TEXT CHECK (next_match_slot IN ('participant_a', 'participant_b')),
  loser_next_match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,
  loser_next_match_slot TEXT CHECK (loser_next_match_slot IN ('participant_a', 'participant_b')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'in_progress', 'completed', 'bye')),
  score_a INT DEFAULT NULL,
  score_b INT DEFAULT NULL,
  is_bye BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_participants_tournament ON public.participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round ON public.matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_activity_tournament ON public.activity_logs(tournament_id);

-- Migration Statements (Run these if tables already exist)
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('single_elimination', 'double_elimination'));

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_organizer_id_fkey;
ALTER TABLE public.tournaments ALTER COLUMN organizer_id TYPE TEXT;

ALTER TABLE public.participants DROP CONSTRAINT IF EXISTS participants_user_id_fkey;
ALTER TABLE public.participants ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS roster TEXT[] DEFAULT '{}';

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS bracket_type TEXT DEFAULT 'winners';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS loser_next_match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS loser_next_match_slot TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Public can manage tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Public can manage participants" ON public.participants;
DROP POLICY IF EXISTS "Public can manage matches" ON public.matches;
DROP POLICY IF EXISTS "Public can manage activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Public can manage profiles" ON public.profiles;

DROP POLICY IF EXISTS "Organizers can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can update own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can update participants" ON public.participants;
DROP POLICY IF EXISTS "Organizers can manage matches" ON public.matches;

-- Public read & write policies for Arena
CREATE POLICY "Public can manage tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage participants" ON public.participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
