import { describe, it, expect } from "vitest";
import {
  generateBracket,
  advanceMatchWinner,
} from "../bracket-engine";
import { Participant } from "@/types/tournament";

function createParticipants(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`,
    tournament_id: `t_${n}`,
    user_id: null,
    display_name: `Team ${i + 1}`,
    participant_type: "team",
    seed: i + 1,
    registration_status: "confirmed",
    created_at: "",
    updated_at: "",
  }));
}

describe("Double Elimination Bye Resolution Algorithm", () => {
  it("plays a complete 3-team double elimination tournament smoothly without errors", () => {
    const participants = createParticipants(3);

    // generateBracket already automatically runs resolveBracketByes internally!
    const { matches: initialMatches } = generateBracket(
      "t_3",
      participants,
      "seeded",
      "double_elimination"
    );
    let matches = initialMatches;

    // Initial state:
    const wR1M0 = matches.find((m) => m.id === "match_t_3_w_r1_m0")!;
    expect(wR1M0.is_bye).toBe(true);
    expect(wR1M0.winner_id).toBe("p1");

    const wR1M1 = matches.find((m) => m.id === "match_t_3_w_r1_m1")!;
    expect(wR1M1.status).toBe("ready");

    // Play W R1 M1 -> P2 beats P3
    // advanceMatchWinner already automatically runs resolveBracketByes internally!
    let adv = advanceMatchWinner(matches, "match_t_3_w_r1_m1", "p2", 2, 1);
    matches = adv.updatedMatches;

    const lR1M0 = matches.find((m) => m.id === "match_t_3_l_r1_m0")!;
    expect(lR1M0.is_bye).toBe(true);
    expect(lR1M0.status).toBe("bye");
    expect(lR1M0.winner_id).toBe("p3");

    // Losers Finals has P3 in Slot A
    const lR2M0 = matches.find((m) => m.id === "match_t_3_l_r2_m0")!;
    expect(lR2M0.participant_a_id).toBe("p3");
    expect(lR2M0.participant_b_id).toBeNull();

    // Winners Finals (W R2 M0): P1 vs P2
    adv = advanceMatchWinner(matches, "match_t_3_w_r2_m0", "p1", 2, 0);
    matches = adv.updatedMatches;

    // Losers Finals: P3 vs P2 is ready
    const lFinals = matches.find((m) => m.id === "match_t_3_l_r2_m0")!;
    expect(lFinals.status).toBe("ready");

    // P3 wins Losers Finals
    adv = advanceMatchWinner(matches, "match_t_3_l_r2_m0", "p3", 2, 1);
    matches = adv.updatedMatches;

    // Grand Finals: P1 vs P3 is ready
    const gfReady = matches.find((m) => m.id === "match_t_3_gf_r1_m0")!;
    expect(gfReady.status).toBe("ready");

    // P1 wins Grand Finals
    adv = advanceMatchWinner(matches, "match_t_3_gf_r1_m0", "p1", 2, 0);
    expect(adv.isChampionshipWin).toBe(true);
  });

  [4, 5, 6, 7, 8].forEach((n) => {
    it(`simulates entire tournament to completion for N=${n} in double elimination`, () => {
      const participants = createParticipants(n);
      const { matches: initialMatches } = generateBracket(
        `t_${n}`,
        participants,
        "seeded",
        "double_elimination"
      );
      let matches = initialMatches;

      let maxRounds = 50;
      let crowned = false;

      while (maxRounds > 0 && !crowned) {
        maxRounds--;
        const readyMatches = matches.filter((m) => m.status === "ready");
        if (readyMatches.length === 0) break;

        const nextMatch = readyMatches[0];
        // Pick participant A as winner arbitrarily
        const winnerId = nextMatch.participant_a_id!;
        const adv = advanceMatchWinner(matches, nextMatch.id, winnerId, 2, 0);
        matches = adv.updatedMatches;

        if (adv.isChampionshipWin) {
          crowned = true;
          break;
        }
      }

      expect(crowned).toBe(true);
    });
  });
});
