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

const STORAGE_KEY_TOURNAMENTS = "arena_tournaments";
const STORAGE_KEY_PARTICIPANTS = "arena_participants";
const STORAGE_KEY_MATCHES = "arena_matches";
const STORAGE_KEY_LOGS = "arena_activity_logs";
const STORAGE_KEY_USER = "arena_current_user";

// Default Mock User
const DEFAULT_USER: User = {
  id: "user_organizer_arena",
  email: "organizer@arena.gg",
  display_name: "Apex Organizer",
  role: "organizer",
  avatar_url: "",
  created_at: new Date().toISOString(),
};

// Realistic Initial Seed Data
function getInitialSeedData() {
  const t1Id = "tourney_apex_cyber_clash";
  const t2Id = "tourney_nexus_invitational";
  const t3Id = "tourney_titan_masters";

  const tournaments: Tournament[] = [
    {
      id: t1Id,
      organizer_id: DEFAULT_USER.id,
      name: "APEX CYBER CLASH",
      description:
        "The premier regional esports showdown featuring 7 elite combat teams competing for digital supremacy.",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: 8,
      registration_status: "closed",
      status: "in_progress",
      seeding_method: "seeded",
      has_scoring: true,
      champion_id: null,
      banner_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: t2Id,
      organizer_id: DEFAULT_USER.id,
      name: "NEXUS INVITATIONAL",
      description:
        "High-stakes 1v1 tactical fighting tournament with 13 registered contenders and a 16-slot dynamic bracket.",
      format: "single_elimination",
      participant_type: "individual",
      capacity_limit: 16,
      registration_status: "open",
      status: "registration_open",
      seeding_method: "seeded",
      has_scoring: true,
      champion_id: null,
      banner_url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: t3Id,
      organizer_id: DEFAULT_USER.id,
      name: "TITAN MASTERS 2026",
      description:
        "Special 5-team championship bracket showcasing the dynamic single-elimination generator with automatic bye progression.",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: null,
      registration_status: "closed",
      status: "ready",
      seeding_method: "seeded",
      has_scoring: true,
      champion_id: null,
      banner_url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Participants for Tournament 1 (7 Teams from prompt: Team Alpha, Team Omega, Team Nova, Team Eclipse, Team Phantom, Team Vortex, Team Titan)
  const t1TeamNames = [
    "Team Alpha",
    "Team Omega",
    "Team Nova",
    "Team Eclipse",
    "Team Phantom",
    "Team Vortex",
    "Team Titan",
  ];
  const participantsT1: Participant[] = t1TeamNames.map((name, i) => ({
    id: `part_t1_${i + 1}`,
    tournament_id: t1Id,
    user_id: null,
    display_name: name,
    participant_type: "team",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: new Date(Date.now() - 3600000 * 20 + i * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Participants for Tournament 2 (13 solo players)
  const t2PlayerNames = [
    "ViperZero",
    "CyberGhost",
    "Khaos",
    "ShadowPulse",
    "RogueWave",
    "NexusPrime",
    "IronClad",
    "QuantumShift",
    "BlazeFang",
    "Zenith",
    "FrostBite",
    "EchoStrike",
    "ApexHunter",
  ];
  const participantsT2: Participant[] = t2PlayerNames.map((name, i) => ({
    id: `part_t2_${i + 1}`,
    tournament_id: t2Id,
    user_id: null,
    display_name: name,
    participant_type: "individual",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: new Date(Date.now() - 3600000 * 10 + i * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Participants for Tournament 3 (5 teams)
  const t3TeamNames = [
    "Aegis Vanguard",
    "Chrono Legion",
    "Valkyrie Ops",
    "Frostbite Division",
    "Ironclad Core",
  ];
  const participantsT3: Participant[] = t3TeamNames.map((name, i) => ({
    id: `part_t3_${i + 1}`,
    tournament_id: t3Id,
    user_id: null,
    display_name: name,
    participant_type: "team",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: new Date(Date.now() - 3600000 * 5 + i * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const allParticipants = [...participantsT1, ...participantsT2, ...participantsT3];

  // Pre-generate bracket for Tournament 1 (7 teams -> 8 capacity, 1 bye)
  const { matches: t1Matches } = generateBracket(t1Id, participantsT1, "seeded");

  // Pre-generate bracket for Tournament 3 (5 teams -> 8 capacity, 3 byes)
  const { matches: t3Matches } = generateBracket(t3Id, participantsT3, "seeded");

  const allMatches = [...t1Matches, ...t3Matches];

  const logs: ActivityLog[] = [
    {
      id: "log_1",
      tournament_id: t1Id,
      action: "Tournament Created",
      description: "APEX CYBER CLASH created by Apex Organizer.",
      actor_name: "Apex Organizer",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "log_2",
      tournament_id: t1Id,
      action: "Bracket Generated",
      description: "Bracket generated for 7 teams. Seed 1 (Team Alpha) awarded Round 1 bye.",
      actor_name: "Apex Organizer",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  return {
    tournaments,
    participants: allParticipants,
    matches: allMatches,
    logs,
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

// Initialize browser storage if empty
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
}

export function generateTournamentBracket(tournamentId: string): TournamentDetails {
  const details = getTournamentById(tournamentId);
  if (!details) throw new Error(`Tournament ${tournamentId} not found.`);

  const { matches: newMatches, participants: updatedParticipants } = generateBracket(
    tournamentId,
    details.participants,
    details.tournament.seeding_method
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
}
