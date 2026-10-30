import { describe, it, expect } from "vitest";
import { normalizeParticipantFromSupabase } from "../storage";

describe("Cloud Sync Resilience and Roster Encoding", () => {
  it("normalizes participant when roster array is present from database column", () => {
    const raw = {
      id: "part_1",
      tournament_id: "tourney_1",
      user_id: null,
      display_name: "Team Alpha",
      participant_type: "team",
      seed: 1,
      registration_status: "confirmed",
      roster: ["Alice", "Bob", "Charlie"],
      created_at: "2026-10-30T00:00:00.000Z",
      updated_at: "2026-10-30T00:00:00.000Z",
    };

    const normalized = normalizeParticipantFromSupabase(raw);
    expect(normalized.id).toBe("part_1");
    expect(normalized.roster).toEqual(["Alice", "Bob", "Charlie"]);
    expect(normalized.user_id).toBeNull();
  });

  it("decodes fallback ROSTER_DATA from user_id if roster column was missing", () => {
    const raw = {
      id: "part_2",
      tournament_id: "tourney_1",
      user_id: 'ROSTER_DATA:["Dave","Eve","Frank"]',
      display_name: "Team Bravo",
      participant_type: "team",
      seed: 2,
      registration_status: "confirmed",
      created_at: "2026-10-30T00:00:00.000Z",
      updated_at: "2026-10-30T00:00:00.000Z",
    };

    const normalized = normalizeParticipantFromSupabase(raw);
    expect(normalized.id).toBe("part_2");
    expect(normalized.roster).toEqual(["Dave", "Eve", "Frank"]);
    expect(normalized.user_id).toBeNull();
  });

  it("handles participant with no roster safely", () => {
    const raw = {
      id: "part_3",
      tournament_id: "tourney_1",
      user_id: null,
      display_name: "Solo Player",
      participant_type: "individual",
      seed: 3,
      registration_status: "confirmed",
      created_at: "2026-10-30T00:00:00.000Z",
      updated_at: "2026-10-30T00:00:00.000Z",
    };

    const normalized = normalizeParticipantFromSupabase(raw);
    expect(normalized.roster).toBeUndefined();
    expect(normalized.user_id).toBeNull();
  });
});
