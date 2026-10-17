import {
  Tournament,
  Participant,
  Match,
  ActivityLog,
  TournamentDetails,
  User,
  UserRole,
} from "@/types/tournament";
import {
  generateBracket,
  advanceMatchWinner,
  correctMatchWinner as engineCorrectMatchWinner,
} from "./bracket-engine";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_TOURNAMENTS = "arena_tournaments";
const STORAGE_KEY_PARTICIPANTS = "arena_participants";
const STORAGE_KEY_MATCHES = "arena_matches";
const STORAGE_KEY_LOGS = "arena_activity_logs";
const STORAGE_KEY_USER = "arena_current_user";

// Default Mock User
const DEFAULT_USER: User = {
  id: "user_organizer_arena",
  email: "organizer@arena.gg",
  display_name: "Organizer",
  role: "organizer",
  avatar_url: "",
  created_at: new Date().toISOString(),
};

// Clean Initial State (No dummy data)
function getInitialSeedData(): {
  tournaments: Tournament[];
  participants: Participant[];
  matches: Match[];
  logs: ActivityLog[];
} {
  return {
    tournaments: [],
    participants: [],
    matches: [],
    logs: [],
  };
}

// In-Memory Fallback State (Initialized once in Node / SSR / Browser)
const memoryStore = getInitialSeedData();
let currentUserState: User = DEFAULT_USER;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.error(`Failed to load key ${key} from localStorage`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save key ${key} to localStorage`, err);
  }
}

let isSyncing = false;
let hasSynced = false;

export async function syncFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || !isBrowser() || isSyncing) return;

  isSyncing = true;
  try {
    const [tRes, pRes, mRes, lRes] = await Promise.all([
      supabase.from("tournaments").select("*"),
      supabase.from("participants").select("*"),
      supabase.from("matches").select("*"),
      supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }),
    ]);

    let hadUpdates = false;

    if (tRes.data && tRes.data.length > 0) {
      saveToStorage(STORAGE_KEY_TOURNAMENTS, tRes.data);
      hadUpdates = true;
    }
    if (pRes.data && pRes.data.length > 0) {
      saveToStorage(STORAGE_KEY_PARTICIPANTS, pRes.data);
      hadUpdates = true;
    }
    if (mRes.data && mRes.data.length > 0) {
      saveToStorage(STORAGE_KEY_MATCHES, mRes.data);
      hadUpdates = true;
    }
    if (lRes.data && lRes.data.length > 0) {
      saveToStorage(STORAGE_KEY_LOGS, lRes.data);
      hadUpdates = true;
    }

    if (hadUpdates) {
      window.dispatchEvent(new Event("arena_storage_synced"));
    }
  } catch (err) {
    console.warn("Supabase background sync failed, operating in local storage mode:", err);
  } finally {
    isSyncing = false;
  }
}

function pushTournamentToSupabase(tournament: Tournament) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase
    .from("tournaments")
    .upsert(tournament)
    .then(({ error }) => {
      if (error) console.warn("Supabase tournament upsert:", error.message);
    });
}

function pushParticipantsToSupabase(participants: Participant[]) {
  const supabase = getSupabaseClient();
  if (!supabase || participants.length === 0) return;
  supabase
    .from("participants")
    .upsert(participants)
    .then(({ error }) => {
      if (error) console.warn("Supabase participants upsert:", error.message);
    });
}

function deleteParticipantFromSupabase(participantId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase
    .from("participants")
    .delete()
    .eq("id", participantId)
    .then(({ error }) => {
      if (error) console.warn("Supabase participant delete:", error.message);
    });
}

function pushMatchesToSupabase(matches: Match[]) {
  const supabase = getSupabaseClient();
  if (!supabase || matches.length === 0) return;
  supabase
    .from("matches")
    .upsert(matches)
    .then(({ error }) => {
      if (error) console.warn("Supabase matches upsert:", error.message);
    });
}

function deleteMatchesFromSupabase(tournamentId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .then(({ error }) => {
      if (error) console.warn("Supabase matches delete:", error.message);
    });
}

function pushLogToSupabase(log: ActivityLog) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  supabase
    .from("activity_logs")
    .insert(log)
    .then(({ error }) => {
      if (error) console.warn("Supabase activity_logs insert:", error.message);
    });
}

export function initStorage(): void {
  if (!isBrowser()) return;
  const existing = window.localStorage.getItem(STORAGE_KEY_TOURNAMENTS);
  if (!existing) {
    const seed = getInitialSeedData();
    saveToStorage(STORAGE_KEY_TOURNAMENTS, seed.tournaments);
    saveToStorage(STORAGE_KEY_PARTICIPANTS, seed.participants);
    saveToStorage(STORAGE_KEY_MATCHES, seed.matches);
    saveToStorage(STORAGE_KEY_LOGS, seed.logs);
    saveToStorage(STORAGE_KEY_USER, DEFAULT_USER);
  } else {
    try {
      const parsed: Tournament[] = JSON.parse(existing);
      const isLegacyDummy = parsed.some((t) =>
        t.id.startsWith("tourney_apex_cyber_clash") ||
        t.id.startsWith("tourney_nexus_invitational") ||
        t.id.startsWith("tourney_titan_masters")
      );
      if (isLegacyDummy) {
        const cleanTourneys = parsed.filter(
          (t) =>
            !t.id.startsWith("tourney_apex_cyber_clash") &&
            !t.id.startsWith("tourney_nexus_invitational") &&
            !t.id.startsWith("tourney_titan_masters")
        );
        saveToStorage(STORAGE_KEY_TOURNAMENTS, cleanTourneys);
      }
    } catch {
      // ignore
    }
  }

  // Auto sync cloud data if Supabase credentials are configured
  if (isSupabaseConfigured() && !hasSynced) {
    hasSynced = true;
    syncFromSupabase();
  }
}

export function getCurrentUser(): User {
  if (isBrowser()) {
    return loadFromStorage(STORAGE_KEY_USER, currentUserState);
  }
  return currentUserState;
}

export function setCurrentUserRole(role: UserRole): User {
  const current = getCurrentUser();
  const updated: User = {
    ...current,
    role,
    display_name: role === "organizer" ? "Apex Organizer" : role === "admin" ? "Arena Admin" : "Competitor Phoenix",
  };
  currentUserState = updated;
  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_USER, updated);
  }
  return updated;
}

export function getTournaments(): Tournament[] {
  if (isBrowser()) {
    initStorage();
    return loadFromStorage(STORAGE_KEY_TOURNAMENTS, memoryStore.tournaments);
  }
  return memoryStore.tournaments;
}

export function getTournamentById(id: string): TournamentDetails | null {
  const tournaments = getTournaments();
  const tournament = tournaments.find((t) => t.id === id);
  if (!tournament) return null;

  const allParticipants: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;

  const allMatches: Match[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_MATCHES, memoryStore.matches)
    : memoryStore.matches;

  const allLogs: ActivityLog[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_LOGS, memoryStore.logs)
    : memoryStore.logs;

  const participants = allParticipants.filter((p) => p.tournament_id === id);
  const matches = allMatches.filter((m) => m.tournament_id === id);
  const activity_logs = allLogs
    .filter((l) => l.tournament_id === id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const champion = tournament.champion_id
    ? participants.find((p) => p.id === tournament.champion_id) || null
    : null;

  return {
    tournament,
    participants,
    matches,
    champion,
    activity_logs,
  };
}

export function createTournament(
  data: Omit<Tournament, "id" | "organizer_id" | "status" | "champion_id" | "created_at" | "updated_at">
): Tournament {
  const user = getCurrentUser();
  const newTourney: Tournament = {
    ...data,
    id: `tourney_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    organizer_id: user.id,
    status: "registration_open",
    champion_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const list = getTournaments();
  const updatedList = [newTourney, ...list];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_TOURNAMENTS, updatedList);
  } else {
    memoryStore.tournaments = updatedList;
  }

  logActivity(
    newTourney.id,
    "Tournament Created",
    `Tournament "${newTourney.name}" created by ${user.display_name}.`
  );

  pushTournamentToSupabase(newTourney);

  return newTourney;
}

export function updateTournament(id: string, updates: Partial<Tournament>): Tournament {
  const list = getTournaments();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`Tournament ${id} not found.`);

  const updated: Tournament = {
    ...list[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  list[index] = updated;

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_TOURNAMENTS, list);
  } else {
    memoryStore.tournaments = list;
  }

  logActivity(id, "Tournament Updated", `Settings updated for "${updated.name}".`);
  pushTournamentToSupabase(updated);
  return updated;
}

export function addParticipant(
  tournamentId: string,
  displayName: string,
  participantType: "individual" | "team" = "team",
  seed?: number
): Participant {
  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("Participant name cannot be blank.");

  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  if (details.tournament.capacity_limit && details.participants.length >= details.tournament.capacity_limit) {
    throw new Error(`Tournament is full (capacity: ${details.tournament.capacity_limit}).`);
  }

  // Check duplicates
  const isDuplicate = details.participants.some(
    (p) => p.display_name.toLowerCase() === trimmed.toLowerCase()
  );
  if (isDuplicate) {
    throw new Error(`A competitor named "${trimmed}" is already registered.`);
  }

  const nextSeed = seed ?? details.participants.length + 1;
  const newParticipant: Participant = {
    id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tournament_id: tournamentId,
    user_id: null,
    display_name: trimmed,
    participant_type: participantType,
    seed: nextSeed,
    registration_status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const allParts: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;

  const updatedParts = [...allParts, newParticipant];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_PARTICIPANTS, updatedParts);
  } else {
    memoryStore.participants = updatedParts;
  }

  logActivity(
    tournamentId,
    "Participant Registered",
    `${newParticipant.display_name} registered (Seed #${newParticipant.seed}).`
  );

  pushParticipantsToSupabase([newParticipant]);

  return newParticipant;
}

export function bulkAddParticipants(tournamentId: string, rawLines: string[]): Participant[] {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  const validNames = rawLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (validNames.length === 0) {
    throw new Error("No valid competitor names found to import.");
  }

  const existingNames = new Set(
    details.participants.map((p) => p.display_name.toLowerCase())
  );

  const createdParticipants: Participant[] = [];
  let currentSeed = details.participants.length + 1;

  for (const name of validNames) {
    if (existingNames.has(name.toLowerCase())) {
      continue; // Skip exact duplicates
    }
    existingNames.add(name.toLowerCase());

    const p: Participant = {
      id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tournament_id: tournamentId,
      user_id: null,
      display_name: name,
      participant_type: details.tournament.participant_type,
      seed: currentSeed++,
      registration_status: "confirmed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    createdParticipants.push(p);
  }

  if (createdParticipants.length === 0) {
    throw new Error("All provided participants already exist in the tournament.");
  }

  const allParts: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;

  const updatedParts = [...allParts, ...createdParticipants];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_PARTICIPANTS, updatedParts);
  } else {
    memoryStore.participants = updatedParts;
  }

  logActivity(
    tournamentId,
    "Bulk Import Completed",
    `Added ${createdParticipants.length} participants via bulk entry.`
  );

  pushParticipantsToSupabase(createdParticipants);

  return createdParticipants;
}

export function updateParticipantName(participantId: string, newDisplayName: string): Participant {
  const trimmed = newDisplayName.trim();
  if (!trimmed) throw new Error("Participant name cannot be empty.");

  const allParts: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;

  const index = allParts.findIndex((p) => p.id === participantId);
  if (index === -1) throw new Error(`Participant ${participantId} not found.`);

  const oldName = allParts[index].display_name;
  allParts[index].display_name = trimmed;
  allParts[index].updated_at = new Date().toISOString();

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_PARTICIPANTS, allParts);
  } else {
    memoryStore.participants = allParts;
  }

  logActivity(
    allParts[index].tournament_id,
    "Participant Renamed",
    `Renamed "${oldName}" to "${trimmed}". Identity & match connections preserved.`
  );

  pushParticipantsToSupabase([allParts[index]]);

  return allParts[index];
}

export function removeParticipant(participantId: string): void {
  const allParts: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;

  const target = allParts.find((p) => p.id === participantId);
  if (!target) return;

  const filtered = allParts.filter((p) => p.id !== participantId);

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_PARTICIPANTS, filtered);
  } else {
    memoryStore.participants = filtered;
  }

  logActivity(
    target.tournament_id,
    "Participant Removed",
    `Removed "${target.display_name}" from tournament.`
  );

  deleteParticipantFromSupabase(participantId);
}

export function generateTournamentBracket(tournamentId: string): TournamentDetails {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  const { matches: newMatches, participants: updatedParticipants } = generateBracket(
    tournamentId,
    details.participants,
    details.tournament.seeding_method,
    details.tournament.format
  );

  // Update matches
  const allMatches: Match[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_MATCHES, memoryStore.matches)
    : memoryStore.matches;
  const filteredMatches = allMatches.filter((m) => m.tournament_id !== tournamentId);
  const updatedMatchesList = [...filteredMatches, ...newMatches];

  // Update participants (seeds)
  const allParts: Participant[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_PARTICIPANTS, memoryStore.participants)
    : memoryStore.participants;
  const nonTourneyParts = allParts.filter((p) => p.tournament_id !== tournamentId);
  const updatedPartsList = [...nonTourneyParts, ...updatedParticipants];

  // Update tournament status to 'in_progress' or 'ready'
  updateTournament(tournamentId, {
    status: "in_progress",
    registration_status: "closed",
    champion_id: null,
  });

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_MATCHES, updatedMatchesList);
    saveToStorage(STORAGE_KEY_PARTICIPANTS, updatedPartsList);
  } else {
    memoryStore.matches = updatedMatchesList;
    memoryStore.participants = updatedPartsList;
  }

  logActivity(
    tournamentId,
    "Bracket Generated",
    `Bracket generated for ${updatedParticipants.length} participants.`
  );

  pushMatchesToSupabase(newMatches);
  pushParticipantsToSupabase(updatedParticipants);

  return getTournamentById(tournamentId)!;
}

export function recordMatchWinner(
  tournamentId: string,
  matchId: string,
  winnerId: string,
  scoreA: number | null = null,
  scoreB: number | null = null
): { details: TournamentDetails; isChampionshipWin: boolean } {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  const { updatedMatches: tournamentMatches, isChampionshipWin } = advanceMatchWinner(
    details.matches,
    matchId,
    winnerId,
    scoreA,
    scoreB
  );

  // Save all matches
  const allMatches: Match[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_MATCHES, memoryStore.matches)
    : memoryStore.matches;
  const otherMatches = allMatches.filter((m) => m.tournament_id !== tournamentId);
  const updatedAllMatches = [...otherMatches, ...tournamentMatches];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_MATCHES, updatedAllMatches);
  } else {
    memoryStore.matches = updatedAllMatches;
  }

  pushMatchesToSupabase(tournamentMatches);

  const winner = details.participants.find((p) => p.id === winnerId);
  const match = details.matches.find((m) => m.id === matchId);
  const loserId =
    match?.participant_a_id === winnerId ? match?.participant_b_id : match?.participant_a_id;
  const loser = details.participants.find((p) => p.id === loserId);

  if (isChampionshipWin) {
    updateTournament(tournamentId, {
      status: "completed",
      champion_id: winnerId,
    });
    logActivity(
      tournamentId,
      "CHAMPION CROWNED",
      `🏆 ${winner?.display_name || "Winner"} defeated ${loser?.display_name || "Opponent"} to win the Championship!`
    );
  } else {
    logActivity(
      tournamentId,
      "Match Completed",
      `${winner?.display_name || "Winner"} advanced past ${loser?.display_name || "Opponent"}.`
    );
  }

  return {
    details: getTournamentById(tournamentId)!,
    isChampionshipWin,
  };
}

export function correctMatchResult(
  tournamentId: string,
  matchId: string,
  newWinnerId: string,
  scoreA: number | null = null,
  scoreB: number | null = null
): TournamentDetails {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  const { updatedMatches, invalidatedMatchIds } = engineCorrectMatchWinner(
    details.matches,
    matchId,
    newWinnerId,
    scoreA,
    scoreB
  );

  // If tournament was marked completed or had a champion, reset it back to in_progress
  if (details.tournament.status === "completed" || details.tournament.champion_id) {
    updateTournament(tournamentId, {
      status: "in_progress",
      champion_id: null,
    });
  }

  const allMatches: Match[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_MATCHES, memoryStore.matches)
    : memoryStore.matches;
  const otherMatches = allMatches.filter((m) => m.tournament_id !== tournamentId);
  const updatedAllMatches = [...otherMatches, ...updatedMatches];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_MATCHES, updatedAllMatches);
  } else {
    memoryStore.matches = updatedAllMatches;
  }

  pushMatchesToSupabase(updatedMatches);

  const winner = details.participants.find((p) => p.id === newWinnerId);
  logActivity(
    tournamentId,
    "Result Corrected",
    `Match result corrected. ${winner?.display_name} declared winner. ${invalidatedMatchIds.length} downstream match(es) safely invalidated.`
  );

  return getTournamentById(tournamentId)!;
}

export function resetTournament(tournamentId: string): TournamentDetails {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  // Clear all matches for this tournament
  const allMatches: Match[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_MATCHES, memoryStore.matches)
    : memoryStore.matches;
  const remainingMatches = allMatches.filter((m) => m.tournament_id !== tournamentId);

  updateTournament(tournamentId, {
    status: "registration_open",
    registration_status: "open",
    champion_id: null,
  });

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_MATCHES, remainingMatches);
  } else {
    memoryStore.matches = remainingMatches;
  }

  deleteMatchesFromSupabase(tournamentId);

  logActivity(
    tournamentId,
    "Tournament Reset",
    "Bracket reset by organizer. All match results cleared; participants preserved."
  );

  return getTournamentById(tournamentId)!;
}

export function logActivity(
  tournamentId: string,
  action: string,
  description: string
): void {
  const user = getCurrentUser();
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tournament_id: tournamentId,
    action,
    description,
    actor_name: user.display_name,
    timestamp: new Date().toISOString(),
  };

  const allLogs: ActivityLog[] = isBrowser()
    ? loadFromStorage(STORAGE_KEY_LOGS, memoryStore.logs)
    : memoryStore.logs;
  const updatedLogs = [newLog, ...allLogs];

  if (isBrowser()) {
    saveToStorage(STORAGE_KEY_LOGS, updatedLogs);
  } else {
    memoryStore.logs = updatedLogs;
  }

  pushLogToSupabase(newLog);
}
