import { Match, Participant, TournamentStats, TournamentStatus } from "@/types/tournament";

/**
 * Calculates the smallest power of 2 greater than or equal to N
 */
export function getLogicalCapacity(participantCount: number): number {
  if (participantCount < 2) return 0;
  return Math.pow(2, Math.ceil(Math.log2(participantCount)));
}

/**
 * Calculates the number of rounds for N participants
 */
export function getRoundsCount(participantCount: number): number {
  if (participantCount < 2) return 0;
  return Math.ceil(Math.log2(participantCount));
}

/**
 * Generates the standard tournament seeding order for bracket size S.
 * Uses recursive bracket expansion where pairs in each match sum to (S + 1).
 * E.g., S=2 -> [1, 2]
 * S=4 -> [1, 4, 2, 3]
 * S=8 -> [1, 8, 4, 5, 2, 7, 3, 6]
 */
export function generateSeedOrder(capacity: number): number[] {
  if (capacity < 2) return [];
  const rounds = Math.log2(capacity);
  let order: number[] = [1, 2];

  for (let r = 1; r < rounds; r++) {
    const nextOrder: number[] = [];
    const sum = Math.pow(2, r + 1) + 1;
    for (const seed of order) {
      nextOrder.push(seed);
      nextOrder.push(sum - seed);
    }
    order = nextOrder;
  }

  return order;
}

export function getRoundName(roundNumber: number, totalRounds: number): string {
  if (roundNumber === totalRounds) return "Championship Final";
  if (roundNumber === totalRounds - 1) return "Semifinals";
  if (roundNumber === totalRounds - 2) return "Quarterfinals";
  if (roundNumber === totalRounds - 3) return "Round of 16";
  return `Round ${roundNumber}`;
}

export interface GenerateBracketResult {
  matches: Match[];
  participants: Participant[];
  totalRounds: number;
  logicalCapacity: number;
  byeCount: number;
  competitiveMatchesCount: number;
}

/**
 * Generates a full single-elimination tournament bracket for ANY N >= 2 participants.
 * Distributes byes to top seeds, links all matches across rounds, and automatically
 * advances bye recipients into Round 2 without fake opponents or fake matches.
 */
export function generateBracket(
  tournamentId: string,
  rawParticipants: Participant[],
  seedingMethod: "random" | "seeded" | "manual" = "seeded"
): GenerateBracketResult {
  const eligible = rawParticipants.filter(
    (p) => p.registration_status === "confirmed"
  );
  const N = eligible.length;

  if (N < 2) {
    throw new Error(
      `Cannot generate tournament bracket: at least 2 confirmed participants are required (found ${N}).`
    );
  }

  const S = getLogicalCapacity(N);
  const totalRounds = getRoundsCount(N);
  const byeCount = S - N;
  const competitiveMatchesCount = N - 1;

  // 1. Order participants according to seeding method
  let seededParticipants: Participant[] = [];

  if (seedingMethod === "random") {
    // Fisher-Yates shuffle
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    seededParticipants = shuffled.map((p, idx) => ({
      ...p,
      seed: idx + 1,
      updated_at: new Date().toISOString(),
    }));
  } else if (seedingMethod === "seeded") {
    // Sort by existing seed if provided, otherwise preserve registration order
    const hasExistingSeeds = eligible.some((p) => p.seed !== null && p.seed > 0);
    if (hasExistingSeeds) {
      seededParticipants = [...eligible].sort(
        (a, b) => (a.seed ?? 999999) - (b.seed ?? 999999)
      );
    } else {
      seededParticipants = [...eligible];
    }
    seededParticipants = seededParticipants.map((p, idx) => ({
      ...p,
      seed: idx + 1,
      updated_at: new Date().toISOString(),
    }));
  } else {
    // Manual order preserved
    seededParticipants = eligible.map((p, idx) => ({
      ...p,
      seed: p.seed ?? idx + 1,
      updated_at: new Date().toISOString(),
    }));
  }

  // Map seed number (1-indexed) to participant
  const participantBySeed = new Map<number, Participant>();
  seededParticipants.forEach((p) => {
    if (p.seed) participantBySeed.set(p.seed, p);
  });

  // 2. Build match tree skeleton across all rounds
  // Round r has S / (2^r) matches.
  // Pre-generate unique IDs so links can be assigned cleanly.
  const roundMatches: Match[][] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRoundCount = S / Math.pow(2, r);
    const currentRound: Match[] = [];

    for (let pos = 0; pos < matchesInRoundCount; pos++) {
      const matchId = `match_${tournamentId}_r${r}_m${pos}`;
      currentRound.push({
        id: matchId,
        tournament_id: tournamentId,
        round_number: r,
        match_position: pos,
        participant_a_id: null,
        participant_b_id: null,
        winner_id: null,
        next_match_id: null,
        next_match_slot: null,
        status: "pending",
        score_a: null,
        score_b: null,
        is_bye: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    roundMatches.push(currentRound);
  }

  // 3. Link next_match_id and next_match_slot for each match
  for (let r = 1; r < totalRounds; r++) {
    const currentMatches = roundMatches[r - 1];
    const nextMatches = roundMatches[r];

    currentMatches.forEach((match, pos) => {
      const targetPos = Math.floor(pos / 2);
      const targetSlot = pos % 2 === 0 ? "participant_a" : "participant_b";
      match.next_match_id = nextMatches[targetPos].id;
      match.next_match_slot = targetSlot;
    });
  }

  // 4. Populate Round 1 participants and resolve byes
  const seedOrder = generateSeedOrder(S);
  const round1Matches = roundMatches[0];

  round1Matches.forEach((match, pos) => {
    const seedA = seedOrder[2 * pos];
    const seedB = seedOrder[2 * pos + 1];

    const partA = participantBySeed.get(seedA) || null;
    const partB = participantBySeed.get(seedB) || null;

    match.participant_a_id = partA ? partA.id : null;
    match.participant_b_id = partB ? partB.id : null;

    if (partA && partB) {
      // Standard competitive match
      match.status = "ready";
      match.is_bye = false;
      match.winner_id = null;
    } else if (partA && !partB) {
      // Bye in slot B -> partA automatically advances
      match.status = "bye";
      match.is_bye = true;
      match.winner_id = partA.id;
      match.completed_at = new Date().toISOString();

      // Automatically advance to Round 2
      if (match.next_match_id && match.next_match_slot) {
        const nextRoundMatches = roundMatches[1];
        const nextMatch = nextRoundMatches.find((m) => m.id === match.next_match_id);
        if (nextMatch) {
          if (match.next_match_slot === "participant_a") {
            nextMatch.participant_a_id = partA.id;
          } else {
            nextMatch.participant_b_id = partA.id;
          }
        }
      }
    } else if (!partA && partB) {
      // Bye in slot A -> partB automatically advances
      match.status = "bye";
      match.is_bye = true;
      match.winner_id = partB.id;
      match.completed_at = new Date().toISOString();

      if (match.next_match_id && match.next_match_slot) {
        const nextRoundMatches = roundMatches[1];
        const nextMatch = nextRoundMatches.find((m) => m.id === match.next_match_id);
        if (nextMatch) {
          if (match.next_match_slot === "participant_a") {
            nextMatch.participant_a_id = partB.id;
          } else {
            nextMatch.participant_b_id = partB.id;
          }
        }
      }
    }
  });

  // 5. Update status of Round 2+ matches that received bye advances
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = roundMatches[r - 1];
    matchesInRound.forEach((match) => {
      if (match.participant_a_id && match.participant_b_id) {
        match.status = "ready";
      } else {
        match.status = "pending";
      }
    });
  }

  // Flatten all matches
  const allMatches = roundMatches.flat();

  return {
    matches: allMatches,
    participants: seededParticipants,
    totalRounds,
    logicalCapacity: S,
    byeCount,
    competitiveMatchesCount,
  };
}

/**
 * Calculates live tournament statistics based on official persisted records
 */
export function calculateTournamentStats(
  status: TournamentStatus,
  participants: Participant[],
  matches: Match[]
): TournamentStats {
  const eligible = participants.filter((p) => p.registration_status === "confirmed");
  const N = eligible.length;

  if (N < 2 || matches.length === 0) {
    return {
      totalParticipants: N,
      matchesPlayed: 0,
      matchesRemaining: N >= 2 ? N - 1 : 0,
      totalCompetitiveMatches: N >= 2 ? N - 1 : 0,
      currentRound: 1,
      tournamentStatus: status,
      progressPercentage: 0,
    };
  }

  const competitiveMatches = matches.filter((m) => !m.is_bye);
  const totalCompetitiveMatches = N - 1;
  const matchesPlayed = competitiveMatches.filter((m) => m.status === "completed").length;
  const matchesRemaining = Math.max(0, totalCompetitiveMatches - matchesPlayed);

  // Determine current active round: lowest round with uncompleted ready/pending competitive matches
  let currentRound = 1;
  const incompleteCompetitive = competitiveMatches.filter((m) => m.status !== "completed");
  if (incompleteCompetitive.length > 0) {
    currentRound = Math.min(...incompleteCompetitive.map((m) => m.round_number));
  } else if (matchesPlayed === totalCompetitiveMatches) {
    currentRound = Math.max(...matches.map((m) => m.round_number));
  }

  const progressPercentage =
    totalCompetitiveMatches > 0
      ? Math.round((matchesPlayed / totalCompetitiveMatches) * 100)
      : 0;

  return {
    totalParticipants: N,
    matchesPlayed,
    matchesRemaining,
    totalCompetitiveMatches,
    currentRound,
    tournamentStatus: status,
    progressPercentage,
  };
}

/**
 * Atomically completes a match and advances the winner into the next-round slot
 */
export function advanceMatchWinner(
  matches: Match[],
  matchId: string,
  winnerId: string,
  scoreA: number | null = null,
  scoreB: number | null = null
): {
  updatedMatches: Match[];
  isChampionshipWin: boolean;
  nextMatchId: string | null;
} {
  const matchIndex = matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) {
    throw new Error(`Match with id ${matchId} not found.`);
  }

  const targetMatch = matches[matchIndex];

  if (targetMatch.is_bye) {
    throw new Error("Cannot set winner on an automatic bye advancement.");
  }

  if (
    targetMatch.participant_a_id !== winnerId &&
    targetMatch.participant_b_id !== winnerId
  ) {
    throw new Error(
      `Winner ID ${winnerId} is not a valid participant in match ${matchId}.`
    );
  }

  // Clone matches immutably
  const newMatches = matches.map((m) => ({ ...m }));
  const matchToUpdate = newMatches[matchIndex];

  matchToUpdate.status = "completed";
  matchToUpdate.winner_id = winnerId;
  matchToUpdate.score_a = scoreA;
  matchToUpdate.score_b = scoreB;
  matchToUpdate.completed_at = new Date().toISOString();
  matchToUpdate.updated_at = new Date().toISOString();

  const isChampionshipWin = matchToUpdate.next_match_id === null;

  // Advance to next match if not final
  if (matchToUpdate.next_match_id && matchToUpdate.next_match_slot) {
    const nextMatch = newMatches.find((m) => m.id === matchToUpdate.next_match_id);
    if (nextMatch) {
      if (matchToUpdate.next_match_slot === "participant_a") {
        nextMatch.participant_a_id = winnerId;
      } else {
        nextMatch.participant_b_id = winnerId;
      }

      // Check if next match is now ready
      if (nextMatch.participant_a_id && nextMatch.participant_b_id) {
        nextMatch.status = "ready";
      } else {
        nextMatch.status = "pending";
      }
      nextMatch.updated_at = new Date().toISOString();
    }
  }

  return {
    updatedMatches: newMatches,
    isChampionshipWin,
    nextMatchId: matchToUpdate.next_match_id,
  };
}

/**
 * Result correction workflow:
 * Safely changes a completed match's winner, and recursively invalidates/resets
 * any downstream matches that were previously decided using the old winner.
 */
export function correctMatchWinner(
  matches: Match[],
  matchId: string,
  newWinnerId: string,
  scoreA: number | null = null,
  scoreB: number | null = null
): {
  updatedMatches: Match[];
  invalidatedMatchIds: string[];
  isChampionshipWin: boolean;
} {
  const matchIndex = matches.findIndex((m) => m.id === matchId);
  if (matchIndex === -1) {
    throw new Error(`Match with id ${matchId} not found.`);
  }

  const targetMatch = matches[matchIndex];
  if (
    targetMatch.participant_a_id !== newWinnerId &&
    targetMatch.participant_b_id !== newWinnerId
  ) {
    throw new Error(
      `New winner ID ${newWinnerId} is not a valid participant in match ${matchId}.`
    );
  }

  const newMatches = matches.map((m) => ({ ...m }));
  const invalidatedMatchIds: string[] = [];

  // Update target match
  const matchToUpdate = newMatches[matchIndex];
  matchToUpdate.status = "completed";
  matchToUpdate.winner_id = newWinnerId;
  matchToUpdate.score_a = scoreA;
  matchToUpdate.score_b = scoreB;
  matchToUpdate.completed_at = new Date().toISOString();
  matchToUpdate.updated_at = new Date().toISOString();

  // Recursively reset downstream matches that relied on oldWinnerId
  let currentMatch = matchToUpdate;
  while (currentMatch.next_match_id) {
    const nextMatch = newMatches.find((m) => m.id === currentMatch.next_match_id);
    if (!nextMatch) break;

    const slot = currentMatch.next_match_slot;
    if (slot === "participant_a") {
      nextMatch.participant_a_id = newWinnerId;
    } else if (slot === "participant_b") {
      nextMatch.participant_b_id = newWinnerId;
    }

    // If next match had already been played or had a winner, it must be reset
    // because its participant changed!
    if (nextMatch.status === "completed" || nextMatch.winner_id !== null) {
      invalidatedMatchIds.push(nextMatch.id);
      nextMatch.status =
        nextMatch.participant_a_id && nextMatch.participant_b_id ? "ready" : "pending";
      nextMatch.winner_id = null;
      nextMatch.score_a = null;
      nextMatch.score_b = null;
      nextMatch.completed_at = null;
    } else {
      nextMatch.status =
        nextMatch.participant_a_id && nextMatch.participant_b_id ? "ready" : "pending";
    }

    nextMatch.updated_at = new Date().toISOString();
    currentMatch = nextMatch;
  }

  const isChampionshipWin = matchToUpdate.next_match_id === null;

  return {
    updatedMatches: newMatches,
    invalidatedMatchIds,
    isChampionshipWin,
  };
}
