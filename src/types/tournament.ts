export type UserRole = "organizer" | "participant" | "admin";

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export type TournamentStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "ready"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ParticipantType = "individual" | "team";

export type SeedingMethod = "random" | "seeded" | "manual";

export type TournamentFormat = "single_elimination" | "double_elimination";

export interface Tournament {
  id: string;
  organizer_id: string;
  name: string;
  description: string;
  format: TournamentFormat;
  participant_type: ParticipantType;
  capacity_limit: number | null;
  registration_status: "open" | "closed";
  status: TournamentStatus;
  seeding_method: SeedingMethod;
  has_scoring: boolean;
  champion_id: string | null;
  banner_url?: string;
  created_at: string;
  updated_at: string;
}

export type ParticipantRegistrationStatus = "confirmed" | "pending" | "withdrawn";

export interface Participant {
  id: string;
  tournament_id: string;
  user_id: string | null;
  display_name: string;
  participant_type: ParticipantType;
  seed: number | null;
  registration_status: ParticipantRegistrationStatus;
  roster?: string[];
  created_at: string;
  updated_at: string;
}

export type MatchStatus = "pending" | "ready" | "in_progress" | "completed" | "bye";

export type MatchSlot = "participant_a" | "participant_b";

export type BracketBranch = "winners" | "losers" | "grand_finals";

export interface Match {
  id: string;
  tournament_id: string;
  bracket_type?: BracketBranch;
  round_number: number; // 1-indexed (1, 2, ..., R)
  match_position: number; // 0-indexed position in that round
  participant_a_id: string | null;
  participant_b_id: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_match_slot: MatchSlot | null;
  loser_next_match_id?: string | null;
  loser_next_match_slot?: MatchSlot | null;
  status: MatchStatus;
  score_a: number | null;
  score_b: number | null;
  is_bye: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  tournament_id: string;
  action: string;
  description: string;
  actor_name: string;
  timestamp: string;
}

export interface BracketRound {
  round_number: number;
  name: string;
  matches: Match[];
}

export interface TournamentDetails {
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  champion: Participant | null;
  activity_logs: ActivityLog[];
}

export interface TournamentStats {
  totalParticipants: number;
  matchesPlayed: number;
  matchesRemaining: number;
  totalCompetitiveMatches: number;
  currentRound: number;
  tournamentStatus: TournamentStatus;
  progressPercentage: number;
}
