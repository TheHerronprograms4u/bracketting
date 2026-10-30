import {
  Match,
  Participant,
  TournamentStats,
  TournamentStatus,
  TournamentFormat,
  BracketBranch,
} from "@/types/tournament";

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

export function getRoundName(
  roundNumber: number,
  totalRounds: number,
  bracketType: BracketBranch = "winners",
  format: TournamentFormat = "single_elimination"
): string {
  if (bracketType === "grand_finals") {
    return "Grand Finals";
  }
  if (bracketType === "losers") {
    if (roundNumber === totalRounds) return "Losers Final";
    if (roundNumber === totalRounds - 1) return "Losers Semifinals";
    return `Losers Round ${roundNumber}`;
  }
  if (format === "double_elimination") {
    if (roundNumber === totalRounds) return "Winners Final";
    if (roundNumber === totalRounds - 1) return "Winners Semifinals";
    return `Winners Round ${roundNumber}`;
  }
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
 * Generates tournament bracket accommodating Single Elimination and Double Elimination (with Losers Bracket)
 */
export function generateBracket(
  tournamentId: string,
  rawParticipants: Participant[],
  seedingMethod: "random" | "seeded" | "manual" = "seeded",
  format: TournamentFormat = "single_elimination"
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
  const totalWinnersRounds = getRoundsCount(N);
  const byeCount = S - N;

  // 1. Order participants according to seeding method
  let seededParticipants: Participant[] = [];

  if (seedingMethod === "random") {
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
    seededParticipants = eligible.map((p, idx) => ({
      ...p,
      seed: p.seed ?? idx + 1,
      updated_at: new Date().toISOString(),
    }));
  }

  const participantBySeed = new Map<number, Participant>();
  seededParticipants.forEach((p) => {
    if (p.seed) participantBySeed.set(p.seed, p);
  });

  // 2. Build Winners Bracket skeleton across all rounds
  const winnersRounds: Match[][] = [];

  for (let r = 1; r <= totalWinnersRounds; r++) {
    const matchesInRoundCount = S / Math.pow(2, r);
    const currentRound: Match[] = [];

    for (let pos = 0; pos < matchesInRoundCount; pos++) {
      const matchId = `match_${tournamentId}_w_r${r}_m${pos}`;
      currentRound.push({
        id: matchId,
        tournament_id: tournamentId,
        bracket_type: "winners",
        round_number: r,
        match_position: pos,
        participant_a_id: null,
        participant_b_id: null,
        winner_id: null,
        next_match_id: null,
        next_match_slot: null,
        loser_next_match_id: null,
        loser_next_match_slot: null,
        status: "pending",
        score_a: null,
        score_b: null,
        is_bye: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    winnersRounds.push(currentRound);
  }

  // Link Winners rounds
  for (let r = 1; r < totalWinnersRounds; r++) {
    const currentMatches = winnersRounds[r - 1];
    const nextMatches = winnersRounds[r];

    currentMatches.forEach((match, pos) => {
      const targetPos = Math.floor(pos / 2);
      const targetSlot = pos % 2 === 0 ? "participant_a" : "participant_b";
      match.next_match_id = nextMatches[targetPos].id;
      match.next_match_slot = targetSlot;
    });
  }

  // 3. If Double Elimination, build Losers Bracket & Grand Finals
  const losersRounds: Match[][] = [];
  let grandFinalsMatch: Match | null = null;

  if (format === "double_elimination") {
    // Grand Finals Match
    grandFinalsMatch = {
      id: `match_${tournamentId}_gf_r1_m0`,
      tournament_id: tournamentId,
      bracket_type: "grand_finals",
      round_number: 1,
      match_position: 0,
      participant_a_id: null,
      participant_b_id: null,
      winner_id: null,
      next_match_id: null,
      next_match_slot: null,
      loser_next_match_id: null,
      loser_next_match_slot: null,
      status: "pending",
      score_a: null,
      score_b: null,
      is_bye: false,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Winners Finals winner advances to Grand Finals (Slot A)
    const winnersFinal = winnersRounds[totalWinnersRounds - 1][0];
    winnersFinal.next_match_id = grandFinalsMatch.id;
    winnersFinal.next_match_slot = "participant_a";

    if (S === 2) {
      // 2 players in Double Elim: Loser of W1 drops to Grand Finals slot B
      winnersFinal.loser_next_match_id = grandFinalsMatch.id;
      winnersFinal.loser_next_match_slot = "participant_b";
    } else {
      // S >= 4: Build full Losers Bracket tree
      const totalLosersRounds = 2 * (totalWinnersRounds - 1);

      for (let k = 1; k <= totalLosersRounds; k++) {
        const halfStep = Math.floor((k - 1) / 2);
        const matchesInK = Math.max(1, (S / 4) / Math.pow(2, halfStep));
        const currentLosersRound: Match[] = [];

        for (let pos = 0; pos < matchesInK; pos++) {
          const matchId = `match_${tournamentId}_l_r${k}_m${pos}`;
          currentLosersRound.push({
            id: matchId,
            tournament_id: tournamentId,
            bracket_type: "losers",
            round_number: k,
            match_position: pos,
            participant_a_id: null,
            participant_b_id: null,
            winner_id: null,
            next_match_id: null,
            next_match_slot: null,
            loser_next_match_id: null,
            loser_next_match_slot: null,
            status: "pending",
            score_a: null,
            score_b: null,
            is_bye: false,
            completed_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        losersRounds.push(currentLosersRound);
      }

      // Link Losers Bracket internally
      for (let k = 1; k < totalLosersRounds; k++) {
        const currentLMatches = losersRounds[k - 1];
        const nextLMatches = losersRounds[k];

        if (k % 2 === 1) {
          // Odd round: winner moves straight into Slot A of the next round
          currentLMatches.forEach((m, pos) => {
            if (nextLMatches[pos]) {
              m.next_match_id = nextLMatches[pos].id;
              m.next_match_slot = "participant_a";
            }
          });
        } else {
          // Even round: winners pair up (2 into 1) into next round
          currentLMatches.forEach((m, pos) => {
            const targetPos = Math.floor(pos / 2);
            if (nextLMatches[targetPos]) {
              m.next_match_id = nextLMatches[targetPos].id;
              m.next_match_slot = pos % 2 === 0 ? "participant_a" : "participant_b";
            }
          });
        }
      }

      // Link final Losers Match (Losers Finals) to Grand Finals (Slot B)
      const losersFinal = losersRounds[totalLosersRounds - 1][0];
      losersFinal.next_match_id = grandFinalsMatch.id;
      losersFinal.next_match_slot = "participant_b";

      // Route losers from Winners Bracket down into Losers Bracket
      // 1. Winners Round 1 losers drop into Losers Round 1 (slots A & B)
      winnersRounds[0].forEach((wMatch, pos) => {
        const targetPos = Math.floor(pos / 2);
        if (losersRounds[0][targetPos]) {
          wMatch.loser_next_match_id = losersRounds[0][targetPos].id;
          wMatch.loser_next_match_slot = pos % 2 === 0 ? "participant_a" : "participant_b";
        }
      });

      // 2. Winners Round w (w >= 2) losers drop into Losers Round 2(w - 1) at Slot B
      for (let w = 2; w <= totalWinnersRounds; w++) {
        const wMatches = winnersRounds[w - 1];
        const targetLosersRoundIdx = 2 * (w - 1) - 1; // 0-indexed
        if (losersRounds[targetLosersRoundIdx]) {
          wMatches.forEach((wMatch, pos) => {
            if (losersRounds[targetLosersRoundIdx][pos]) {
              wMatch.loser_next_match_id = losersRounds[targetLosersRoundIdx][pos].id;
              wMatch.loser_next_match_slot = "participant_b";
            }
          });
        }
      }
    }
  }

  // 4. Populate Round 1 participants and resolve byes
  const seedOrder = generateSeedOrder(S);
  const round1Matches = winnersRounds[0];

  round1Matches.forEach((match, pos) => {
    const seedA = seedOrder[2 * pos];
    const seedB = seedOrder[2 * pos + 1];

    const partA = participantBySeed.get(seedA) || null;
    const partB = participantBySeed.get(seedB) || null;

    match.participant_a_id = partA ? partA.id : null;
    match.participant_b_id = partB ? partB.id : null;

    if (partA && partB) {
      match.status = "ready";
      match.is_bye = false;
      match.winner_id = null;
    } else if (partA && !partB) {
      match.status = "bye";
      match.is_bye = true;
      match.winner_id = partA.id;
      match.completed_at = new Date().toISOString();

      if (match.next_match_id && match.next_match_slot) {
        const nextRoundMatches = winnersRounds[1];
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
      match.status = "bye";
      match.is_bye = true;
      match.winner_id = partB.id;
      match.completed_at = new Date().toISOString();

      if (match.next_match_id && match.next_match_slot) {
        const nextRoundMatches = winnersRounds[1];
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

  // Update status of Winners Round 2+ matches that received bye advances
  for (let r = 2; r <= totalWinnersRounds; r++) {
    const matchesInRound = winnersRounds[r - 1];
    matchesInRound.forEach((match) => {
      if (match.participant_a_id && match.participant_b_id) {
        match.status = "ready";
      } else {
        match.status = "pending";
      }
    });
  }

  // Combine all matches
  const allMatches: Match[] = [
    ...winnersRounds.flat(),
    ...losersRounds.flat(),
    ...(grandFinalsMatch ? [grandFinalsMatch] : []),
  ];

  const resolvedMatches = resolveBracketByes(allMatches);

  const competitiveMatchesCount =
    format === "double_elimination"
      ? resolvedMatches.filter((m) => !m.is_bye).length
      : N - 1;

  return {
    matches: resolvedMatches,
    participants: seededParticipants,
    totalRounds: totalWinnersRounds,
    logicalCapacity: S,
    byeCount,
    competitiveMatchesCount,
  };
}

function canMatchSlotBeFilled(
  match: Match,
  slot: "participant_a" | "participant_b",
  matchesMap: Map<string, Match>,
  visited: Set<string> = new Set()
): boolean {
  if (slot === "participant_a" && match.participant_a_id) return true;
  if (slot === "participant_b" && match.participant_b_id) return true;

  const key = `${match.id}:${slot}`;
  if (visited.has(key)) return false;
  visited.add(key);

  let feederMatch: Match | undefined;
  let isFromLoser = false;

  const allValues = Array.from(matchesMap.values());
  for (const m of allValues) {
    if (m.next_match_id === match.id && m.next_match_slot === slot) {
      feederMatch = m;
      isFromLoser = false;
      break;
    }
    if (m.loser_next_match_id === match.id && m.loser_next_match_slot === slot) {
      feederMatch = m;
      isFromLoser = true;
      break;
    }
  }

  if (!feederMatch) {
    return false;
  }

  if (isFromLoser) {
    // A bye match NEVER produces a loser to route into the losers bracket
    if (feederMatch.is_bye) {
      return false;
    }
    return true;
  }

  // If feeder is routing its winner (via next_match_id):
  if (feederMatch.is_bye && !feederMatch.winner_id) {
    const fCanA = canMatchSlotBeFilled(feederMatch, "participant_a", matchesMap, visited);
    const fCanB = canMatchSlotBeFilled(feederMatch, "participant_b", matchesMap, visited);
    if (!fCanA && !fCanB) {
      return false;
    }
  }

  return true;
}

export function resolveBracketByes(matches: Match[]): Match[] {
  const matchesMap = new Map<string, Match>();
  matches.forEach((m) => matchesMap.set(m.id, { ...m }));

  let changed = true;
  let iterations = 0;

  while (changed && iterations < 30) {
    changed = false;
    iterations++;

    const currentValues = Array.from(matchesMap.values());
    for (const match of currentValues) {
      if (match.status === "completed") continue;

      const canA = canMatchSlotBeFilled(match, "participant_a", matchesMap);
      const canB = canMatchSlotBeFilled(match, "participant_b", matchesMap);

      if (!canA && !canB) {
        if (!match.is_bye || match.status !== "bye") {
          match.is_bye = true;
          match.status = "bye";
          match.winner_id = null;
          match.participant_a_id = null;
          match.participant_b_id = null;
          match.completed_at = new Date().toISOString();
          changed = true;
        }
      } else if (canA && !canB) {
        if (!match.is_bye && match.participant_a_id) {
          match.is_bye = true;
          changed = true;
        }
        if (match.participant_a_id) {
          if (match.status !== "bye" || match.winner_id !== match.participant_a_id) {
            match.status = "bye";
            match.is_bye = true;
            match.winner_id = match.participant_a_id;
            match.completed_at = new Date().toISOString();
            if (match.next_match_id && match.next_match_slot) {
              const nextM = matchesMap.get(match.next_match_id);
              if (nextM) {
                if (match.next_match_slot === "participant_a") {
                  nextM.participant_a_id = match.participant_a_id;
                } else {
                  nextM.participant_b_id = match.participant_a_id;
                }
              }
            }
            changed = true;
          }
        }
      } else if (!canA && canB) {
        if (!match.is_bye && match.participant_b_id) {
          match.is_bye = true;
          changed = true;
        }
        if (match.participant_b_id) {
          if (match.status !== "bye" || match.winner_id !== match.participant_b_id) {
            match.status = "bye";
            match.is_bye = true;
            match.winner_id = match.participant_b_id;
            match.completed_at = new Date().toISOString();
            if (match.next_match_id && match.next_match_slot) {
              const nextM = matchesMap.get(match.next_match_id);
              if (nextM) {
                if (match.next_match_slot === "participant_a") {
                  nextM.participant_a_id = match.participant_b_id;
                } else {
                  nextM.participant_b_id = match.participant_b_id;
                }
              }
            }
            changed = true;
          }
        }
      } else {
        // Both slots can be filled
        match.is_bye = false;
        if (match.participant_a_id && match.participant_b_id) {
          if (match.status !== "ready") {
            match.status = "ready";
            changed = true;
          }
        } else {
          if (match.status !== "pending") {
            match.status = "pending";
            changed = true;
          }
        }
      }
    }
  }

  return Array.from(matchesMap.values());
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
  const totalCompetitiveMatches = competitiveMatches.length;
  const matchesPlayed = competitiveMatches.filter((m) => m.status === "completed").length;
  const matchesRemaining = Math.max(0, totalCompetitiveMatches - matchesPlayed);

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
 * Atomically completes a match, advances winner, and (in double elimination) routes loser to losers bracket
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

  const newMatches = matches.map((m) => ({ ...m }));
  const matchToUpdate = newMatches[matchIndex];

  matchToUpdate.status = "completed";
  matchToUpdate.winner_id = winnerId;
  matchToUpdate.score_a = scoreA;
  matchToUpdate.score_b = scoreB;
  matchToUpdate.completed_at = new Date().toISOString();
  matchToUpdate.updated_at = new Date().toISOString();

  const isChampionshipWin = matchToUpdate.next_match_id === null;

  // 1. Advance winner to next match if not final
  if (matchToUpdate.next_match_id && matchToUpdate.next_match_slot) {
    const nextMatch = newMatches.find((m) => m.id === matchToUpdate.next_match_id);
    if (nextMatch) {
      if (matchToUpdate.next_match_slot === "participant_a") {
        nextMatch.participant_a_id = winnerId;
      } else {
        nextMatch.participant_b_id = winnerId;
      }

      if (nextMatch.participant_a_id && nextMatch.participant_b_id) {
        nextMatch.status = "ready";
      } else {
        nextMatch.status = "pending";
      }
      nextMatch.updated_at = new Date().toISOString();
    }
  }

  // 2. Double Elimination: Route loser into Losers Bracket if configured
  if (matchToUpdate.loser_next_match_id && matchToUpdate.loser_next_match_slot) {
    const loserId =
      matchToUpdate.participant_a_id === winnerId
        ? matchToUpdate.participant_b_id
        : matchToUpdate.participant_a_id;

    if (loserId) {
      const loserTargetMatch = newMatches.find(
        (m) => m.id === matchToUpdate.loser_next_match_id
      );
      if (loserTargetMatch) {
        if (matchToUpdate.loser_next_match_slot === "participant_a") {
          loserTargetMatch.participant_a_id = loserId;
        } else {
          loserTargetMatch.participant_b_id = loserId;
        }

        if (loserTargetMatch.participant_a_id && loserTargetMatch.participant_b_id) {
          loserTargetMatch.status = "ready";
        } else {
          loserTargetMatch.status = "pending";
        }
        loserTargetMatch.updated_at = new Date().toISOString();
      }
    }
  }

  const resolvedMatches = resolveBracketByes(newMatches);

  return {
    updatedMatches: resolvedMatches,
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

  const matchToUpdate = newMatches[matchIndex];
  matchToUpdate.status = "completed";
  matchToUpdate.winner_id = newWinnerId;
  matchToUpdate.score_a = scoreA;
  matchToUpdate.score_b = scoreB;
  matchToUpdate.completed_at = new Date().toISOString();
  matchToUpdate.updated_at = new Date().toISOString();

  // Recursively reset downstream matches that relied on previous winner
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
  const resolvedMatches = resolveBracketByes(newMatches);

  return {
    updatedMatches: resolvedMatches,
    invalidatedMatchIds,
    isChampionshipWin,
  };
}
