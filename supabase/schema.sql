-- ARENA: Dynamic Tournament Bracketing Platform Schema
-- Run this in your Supabase SQL Editor to initialize the database

-- 1. Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('organizer', 'participant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  organizer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  format TEXT NOT NULL DEFAULT 'single_elimination' CHECK (format IN ('single_elimination')),
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
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('individual', 'team')),
  seed INT DEFAULT NULL,
  registration_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (registration_status IN ('confirmed', 'pending', 'withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  match_position INT NOT NULL,
  participant_a_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  participant_b_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  winner_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  next_match_id TEXT REFERENCES public.matches(id) ON DELETE SET NULL,
  next_match_slot TEXT CHECK (next_match_slot IN ('participant_a', 'participant_b')),
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Public can read, user can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tournaments: Published tournaments viewable by everyone
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Organizers can create tournaments" ON public.tournaments FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Organizers can update own tournaments" ON public.tournaments FOR UPDATE USING (auth.uid() = organizer_id);

-- Participants: Viewable by everyone
CREATE POLICY "Participants are viewable by everyone" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Users can register for tournaments" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Organizers can update participants" ON public.participants FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE tournaments.id = participants.tournament_id AND tournaments.organizer_id = auth.uid())
);

-- Matches: Viewable by everyone
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Organizers can manage matches" ON public.matches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.tournaments WHERE tournaments.id = matches.tournament_id AND tournaments.organizer_id = auth.uid())
);

-- Activity logs: Viewable by everyone
CREATE POLICY "Activity logs are viewable by everyone" ON public.activity_logs FOR SELECT USING (true);
