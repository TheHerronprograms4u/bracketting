import { describe, it, expect } from "vitest";
import {
  generateBracket,
  advanceMatchWinner,
  calculateTournamentStats,
} from "../bracket-engine";
import { Participant } from "@/types/tournament";

function generateParticipants(count: number, prefix: string = "Player"): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p_${prefix.toLowerCase()}_${i + 1}`,
    tournament_id: "test_tourney",
    user_id: null,
    display_name: `${prefix} ${i + 1}`,
    participant_type: "team",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

describe("Tournament Bracket Boundary and Stress Cases", () => {
  const boundaryCounts = [15, 16, 17, 31, 32, 33, 63, 64, 65, 127, 128, 129];

  boundaryCounts.forEach((N) => {
    it(`guarantees exactly N-1 (${N - 1}) competitive matches for N=${N}`, () => {
      const participants = generateParticipants(N);
      const result = generateBracket("test", participants, "seeded");

      // Verify N - 1 competitive matches
      const nonByeMatches = result.matches.filter((m) => !m.is_bye);
      expect(nonByeMatches.length).toBe(N - 1);
      expect(result.competitiveMatchesCount).toBe(N - 1);

      // Verify every participant is accounted for
      const participantIds = new Set(participants.map((p) => p.id));
      const bracketParticipantIds = new Set<string>();

      result.matches.forEach((m) => {
        if (m.participant_a_id) bracketParticipantIds.add(m.participant_a_id);
        if (m.participant_b_id) bracketParticipantIds.add(m.participant_b_id);
      });

      participantIds.forEach((id) => {
        expect(bracketParticipantIds.has(id)).toBe(true);
      });
    });
  });

  it("supports random draw seeding without losing participants", () => {
    const N = 13;
    const participants = generateParticipants(N, "Rogue");
    const result = generateBracket("test_random", participants, "random");

    expect(result.participants.length).toBe(13);
    const nonByeMatches = result.matches.filter((m) => !m.is_bye);
    expect(nonByeMatches.length).toBe(12);

    // Verify all seeds 1..13 assigned
    const assignedSeeds = result.participants.map((p) => p.seed).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(assignedSeeds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});

describe("Complete Tournament Simulation: From Round 1 to Grand Champion", () => {
  it("plays out a 7-team tournament through 6 competitive matches to crown a single champion", () => {
    const teamNames = [
      "Team Alpha",
      "Team Omega",
      "Team Nova",
      "Team Eclipse",
      "Team Phantom",
      "Team Vortex",
      "Team Titan",
    ];
    const participants: Participant[] = teamNames.map((name, i) => ({
      id: `team_${i + 1}`,
      tournament_id: "apex_clash",
      user_id: null,
      display_name: name,
      participant_type: "team",
      seed: i + 1,
      registration_status: "confirmed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { matches } = generateBracket("apex_clash", participants, "seeded");

    // Total matches in binary tree = 7 (4 in R1, 2 in R2, 1 in R3)
    expect(matches.length).toBe(7);

    // 1 Bye in Round 1
    const byeMatches = matches.filter((m) => m.is_bye);
    expect(byeMatches.length).toBe(1);
    expect(byeMatches[0].winner_id).toBe(participants[0].id); // Team Alpha (Seed 1)

    // Simulate play-through of remaining 3 Round 1 matches
    let state = matches;
    const r1Playable = state.filter((m) => m.round_number === 1 && !m.is_bye);
    expect(r1Playable.length).toBe(3);

    r1Playable.forEach((match) => {
      const winnerId = match.participant_a_id!;
      const outcome = advanceMatchWinner(state, match.id, winnerId, 2, 0);
      state = outcome.updatedMatches;
    });

    // Check stats after Round 1
    let stats = calculateTournamentStats("in_progress", participants, state);
    expect(stats.matchesPlayed).toBe(3);
    expect(stats.matchesRemaining).toBe(3);

    // Play Round 2 (Semifinals - 2 matches)
    const r2Matches = state.filter((m) => m.round_number === 2);
    expect(r2Matches.length).toBe(2);
    expect(r2Matches.every((m) => m.status === "ready")).toBe(true);

    r2Matches.forEach((match) => {
      const winnerId = match.participant_a_id!;
      const outcome = advanceMatchWinner(state, match.id, winnerId, 2, 1);
      state = outcome.updatedMatches;
    });

    stats = calculateTournamentStats("in_progress", participants, state);
    expect(stats.matchesPlayed).toBe(5);
    expect(stats.matchesRemaining).toBe(1);

    // Play Round 3 (Championship Final - 1 match)
    const finalMatch = state.find((m) => m.round_number === 3)!;
    expect(finalMatch.status).toBe("ready");

    const championOutcome = advanceMatchWinner(
      state,
      finalMatch.id,
      finalMatch.participant_a_id!,
      3,
      2
    );
    state = championOutcome.updatedMatches;
    expect(championOutcome.isChampionshipWin).toBe(true);

    stats = calculateTournamentStats("completed", participants, state);
    expect(stats.matchesPlayed).toBe(6); // exactly 7 - 1 = 6 matches!
    expect(stats.matchesRemaining).toBe(0);
    expect(stats.progressPercentage).toBe(100);

    // Verify champion
    const completedFinal = state.find((m) => m.id === finalMatch.id)!;
    expect(completedFinal.winner_id).toBe(finalMatch.participant_a_id);
  });
});
