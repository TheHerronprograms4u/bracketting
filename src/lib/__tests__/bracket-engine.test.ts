import { describe, it, expect } from "vitest";
import {
  getLogicalCapacity,
  getRoundsCount,
  generateBracket,
  advanceMatchWinner,
  correctMatchWinner,
  calculateTournamentStats,
} from "../bracket-engine";
import { Participant } from "@/types/tournament";

function createMockParticipants(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `part_${i + 1}`,
    tournament_id: "test_tourney",
    user_id: `user_${i + 1}`,
    display_name: `Competitor ${i + 1}`,
    participant_type: "team",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
}

describe("Bracket Engine - Mathematical Capacities & Rounds", () => {
  const testTable: [number, number, number, number][] = [
    // [N, expectedCapacity, expectedRounds, expectedCompetitiveMatches]
    [2, 2, 1, 1],
    [3, 4, 2, 2],
    [5, 8, 3, 4],
    [7, 8, 3, 6],
    [8, 8, 3, 7],
    [9, 16, 4, 8],
    [13, 16, 4, 12],
    [20, 32, 5, 19],
    [27, 32, 5, 26],
    [50, 64, 6, 49],
    [100, 128, 7, 99],
  ];

  testTable.forEach(([N, cap, rounds, compMatches]) => {
    it(`calculates correct capacity, rounds, and matches for N=${N}`, () => {
      expect(getLogicalCapacity(N)).toBe(cap);
      expect(getRoundsCount(N)).toBe(rounds);

      const participants = createMockParticipants(N);
      const result = generateBracket("test", participants, "seeded");

      expect(result.logicalCapacity).toBe(cap);
      expect(result.totalRounds).toBe(rounds);
      expect(result.competitiveMatchesCount).toBe(compMatches);
      expect(result.byeCount).toBe(cap - N);

      // Verify non-bye matches match N - 1
      const actualCompetitive = result.matches.filter((m) => !m.is_bye);
      expect(actualCompetitive.length).toBe(compMatches);
    });
  });

  it("handles 0 and 1 participant cleanly", () => {
    expect(() => generateBracket("test", [], "seeded")).toThrowError(
      /at least 2 confirmed participants are required/
    );
    expect(() =>
      generateBracket("test", createMockParticipants(1), "seeded")
    ).toThrowError(/at least 2 confirmed participants are required/);
  });
});

describe("Bracket Engine - Integrity and Bye Allocation", () => {
  it("verifies 7 participants (e.g. 8-slot bracket, 1 bye, 6 competitive matches)", () => {
    const participants = createMockParticipants(7);
    const result = generateBracket("tourney_7", participants, "seeded");

    expect(result.logicalCapacity).toBe(8);
    expect(result.byeCount).toBe(1);
    expect(result.competitiveMatchesCount).toBe(6);

    // 1 bye in Round 1
    const r1Matches = result.matches.filter((m) => m.round_number === 1);
    expect(r1Matches.length).toBe(4);

    const byeMatches = r1Matches.filter((m) => m.is_bye);
    expect(byeMatches.length).toBe(1);

    // Seed 1 got the bye and automatically advanced to Round 2
    const seed1 = participants.find((p) => p.seed === 1)!;
    expect(byeMatches[0].winner_id).toBe(seed1.id);

    // Round 2 must contain Seed 1 already placed
    const r2Matches = result.matches.filter((m) => m.round_number === 2);
    expect(r2Matches.length).toBe(2);
    const hasSeed1InR2 = r2Matches.some(
      (m) => m.participant_a_id === seed1.id || m.participant_b_id === seed1.id
    );
    expect(hasSeed1InR2).toBe(true);

    // Every competitor must appear in initial bracket or round 2 bye
    const allAssignedIds = new Set<string>();
    result.matches.forEach((m) => {
      if (m.participant_a_id) allAssignedIds.add(m.participant_a_id);
      if (m.participant_b_id) allAssignedIds.add(m.participant_b_id);
    });
    participants.forEach((p) => {
      expect(allAssignedIds.has(p.id)).toBe(true);
    });
  });

  it("verifies 13 participants (16-slot bracket, 3 byes, 12 competitive matches)", () => {
    const participants = createMockParticipants(13);
    const result = generateBracket("tourney_13", participants, "seeded");

    expect(result.logicalCapacity).toBe(16);
    expect(result.byeCount).toBe(3);
    expect(result.competitiveMatchesCount).toBe(12);

    const r1Matches = result.matches.filter((m) => m.round_number === 1);
    expect(r1Matches.length).toBe(8);

    const byeMatches = r1Matches.filter((m) => m.is_bye);
    expect(byeMatches.length).toBe(3);

    const playedR1Matches = r1Matches.filter((m) => !m.is_bye);
    expect(playedR1Matches.length).toBe(5);
  });
});

describe("Bracket Engine - Progression and Winner Advancement", () => {
  it("progresses a 4-team tournament completely to determine a champion", () => {
    const participants = createMockParticipants(4);
    const { matches } = generateBracket("tourney_4", participants, "seeded");

    // Round 1 has 2 matches
    const r1 = matches.filter((m) => m.round_number === 1);
    expect(r1.length).toBe(2);

    // Advance winner of match 1
    const m0 = r1[0];
    const { updatedMatches: step1 } = advanceMatchWinner(
      matches,
      m0.id,
      m0.participant_a_id!,
      2,
      1
    );

    // Advance winner of match 2
    const m1 = step1.find((m) => m.id === r1[1].id)!;
    const { updatedMatches: step2 } = advanceMatchWinner(
      step1,
      m1.id,
      m1.participant_b_id!,
      3,
      0
    );

    // Championship final in round 2 should now be 'ready'
    const finalMatch = step2.find((m) => m.round_number === 2)!;
    expect(finalMatch.status).toBe("ready");
    expect(finalMatch.participant_a_id).toBe(m0.participant_a_id);
    expect(finalMatch.participant_b_id).toBe(m1.participant_b_id);

    // Advance championship final winner
    const { updatedMatches: finalState, isChampionshipWin } = advanceMatchWinner(
      step2,
      finalMatch.id,
      finalMatch.participant_a_id!,
      1,
      0
    );

    expect(isChampionshipWin).toBe(true);
    const completedFinal = finalState.find((m) => m.id === finalMatch.id)!;
    expect(completedFinal.status).toBe("completed");
    expect(completedFinal.winner_id).toBe(finalMatch.participant_a_id);

    // Check statistics
    const stats = calculateTournamentStats("completed", participants, finalState);
    expect(stats.matchesPlayed).toBe(3); // 4 - 1 = 3 matches
    expect(stats.matchesRemaining).toBe(0);
    expect(stats.progressPercentage).toBe(100);
  });
});

describe("Bracket Engine - Result Correction & Downstream Invalidation", () => {
  it("safely resets downstream matches when a prior match result is corrected", () => {
    const participants = createMockParticipants(4);
    const { matches } = generateBracket("tourney_correct", participants, "seeded");

    const r1 = matches.filter((m) => m.round_number === 1);
    const m0 = r1[0];
    const m1 = r1[1];

    // Play R1 Match 0: A wins
    const { updatedMatches: step1 } = advanceMatchWinner(
      matches,
      m0.id,
      m0.participant_a_id!
    );
    // Play R1 Match 1: B wins
    const { updatedMatches: step2 } = advanceMatchWinner(
      step1,
      m1.id,
      m1.participant_b_id!
    );

    // Play Final: A wins championship
    const finalMatch = step2.find((m) => m.round_number === 2)!;
    const { updatedMatches: completedTourney } = advanceMatchWinner(
      step2,
      finalMatch.id,
      finalMatch.participant_a_id!
    );

    expect(
      completedTourney.find((m) => m.id === finalMatch.id)?.status
    ).toBe("completed");

    // Now ORGANIZER CORRECTS R1 Match 0: B was actually the winner!
    const { updatedMatches: correctedMatches, invalidatedMatchIds } =
      correctMatchWinner(completedTourney, m0.id, m0.participant_b_id!);

    expect(invalidatedMatchIds).toContain(finalMatch.id);

    const updatedFinal = correctedMatches.find((m) => m.id === finalMatch.id)!;
    // Final match should have been invalidated and reset to ready with new participant!
    expect(updatedFinal.status).toBe("ready");
    expect(updatedFinal.winner_id).toBeNull();
    expect(updatedFinal.participant_a_id).toBe(m0.participant_b_id);
    expect(updatedFinal.participant_b_id).toBe(m1.participant_b_id);
  });
});
