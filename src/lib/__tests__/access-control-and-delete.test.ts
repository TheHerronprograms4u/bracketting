import { describe, it, expect, beforeEach } from "vitest";
import {
  getCurrentUser,
  setCurrentUserRole,
  createTournament,
  deleteTournament,
  addParticipant,
  bulkAddParticipants,
  updateParticipant,
  generateTournamentBracket,
  recordMatchWinner,
  resetTournament,
  verifyStaffPassword,
  getTournaments,
  getTournamentById,
  STAFF_PASSWORD,
} from "../storage";

describe("Role-Based Access Control and Password Protection", () => {
  beforeEach(() => {
    // Reset to participant before each test
    setCurrentUserRole("participant");
  });

  it("verifies staff password is Access2026", () => {
    expect(STAFF_PASSWORD).toBe("Access2026");
    expect(verifyStaffPassword("Access2026")).toBe(true);
    expect(verifyStaffPassword("wrong_pass")).toBe(false);
    expect(verifyStaffPassword("")).toBe(false);
  });

  it("defaults active user to participant role", () => {
    const user = getCurrentUser();
    expect(user.role).toBe("participant");
    expect(user.display_name).toContain("Participant");
  });

  it("rejects switching to organizer or admin without the correct password", () => {
    expect(() => setCurrentUserRole("organizer")).toThrow(
      "Password authentication required to unlock staff profile."
    );
    expect(() => setCurrentUserRole("organizer", "wrong-password")).toThrow(
      "Password authentication required to unlock staff profile."
    );
    expect(() => setCurrentUserRole("admin", "invalid123")).toThrow(
      "Password authentication required to unlock staff profile."
    );

    // Active user should remain participant
    expect(getCurrentUser().role).toBe("participant");
  });

  it("successfully unlocks organizer and admin roles with password Access2026", () => {
    const organizerUser = setCurrentUserRole("organizer", "Access2026");
    expect(organizerUser.role).toBe("organizer");
    expect(getCurrentUser().role).toBe("organizer");

    const adminUser = setCurrentUserRole("admin", "Access2026");
    expect(adminUser.role).toBe("admin");
    expect(getCurrentUser().role).toBe("admin");

    // Switching back to participant requires no password
    const participantUser = setCurrentUserRole("participant");
    expect(participantUser.role).toBe("participant");
    expect(getCurrentUser().role).toBe("participant");
  });

  it("blocks participant profile from creating a tournament", () => {
    expect(getCurrentUser().role).toBe("participant");

    expect(() =>
      createTournament({
        name: "Unauthorized Tourney",
        description: "Test description",
        format: "single_elimination",
        participant_type: "team",
        capacity_limit: null,
        registration_status: "open",
        seeding_method: "seeded",
        has_scoring: true,
      })
    ).toThrow("Participants are not authorized to create tournaments.");
  });

  it("blocks participant profile from deleting, generating, modifying, or resetting brackets", () => {
    // 1. As Organizer, create tournament and add 2 participants
    setCurrentUserRole("organizer", "Access2026");
    const tourney = createTournament({
      name: "Security Isolation Cup",
      description: "Testing role boundaries",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: null,
      registration_status: "open",
      seeding_method: "seeded",
      has_scoring: true,
    });

    addParticipant(tourney.id, "Team Falcon");
    addParticipant(tourney.id, "Team Eagle");

    // 2. Switch back to participant
    setCurrentUserRole("participant");
    expect(getCurrentUser().role).toBe("participant");

    // Participant cannot delete tournament
    expect(() => deleteTournament(tourney.id)).toThrow(
      "Participants are not authorized to delete tournaments."
    );

    // Participant cannot generate bracket
    expect(() => generateTournamentBracket(tourney.id)).toThrow(
      "Participants are not authorized to generate brackets."
    );

    // Participant cannot bulk add participants
    expect(() => bulkAddParticipants(tourney.id, ["Rogue Alpha", "Rogue Beta"])).toThrow(
      "Participants are not authorized to bulk import participants."
    );

    // Participant cannot reset tournament
    expect(() => resetTournament(tourney.id)).toThrow(
      "Participants are not authorized to reset tournaments."
    );
  });
});

describe("Tournament Deletion Flow (Only After Completion)", () => {
  beforeEach(() => {
    setCurrentUserRole("organizer", "Access2026");
  });

  it("prevents deleting an active or incomplete tournament", () => {
    const tourney = createTournament({
      name: "Incomplete Tournament",
      description: "Cannot be deleted yet",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: null,
      registration_status: "open",
      seeding_method: "seeded",
      has_scoring: true,
    });

    addParticipant(tourney.id, "Alpha");
    addParticipant(tourney.id, "Beta");

    // Status is 'registration_open', not 'completed'
    expect(tourney.status).not.toBe("completed");
    expect(() => deleteTournament(tourney.id)).toThrow(
      "Only completed tournaments can be deleted."
    );

    // Generate bracket -> status becomes 'in_progress'
    const generated = generateTournamentBracket(tourney.id);
    expect(generated.tournament.status).toBe("in_progress");
    expect(() => deleteTournament(tourney.id)).toThrow(
      "Only completed tournaments can be deleted."
    );
  });

  it("allows organizer/admin to delete a tournament once completed and cleans up all data", () => {
    const tourney = createTournament({
      name: "Grand Finale Cup 2026",
      description: "Completed tournament to delete",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: null,
      registration_status: "open",
      seeding_method: "seeded",
      has_scoring: true,
    });

    const p1 = addParticipant(tourney.id, "Finalist 1");
    addParticipant(tourney.id, "Finalist 2");

    const bracket = generateTournamentBracket(tourney.id);
    expect(bracket.matches.length).toBe(1);

    // Complete the match to crown champion
    const finalMatch = bracket.matches[0];
    const { details } = recordMatchWinner(tourney.id, finalMatch.id, p1.id, 2, 0);

    expect(details.tournament.status).toBe("completed");
    expect(details.tournament.champion_id).toBe(p1.id);

    // Verify tournament exists before deletion
    expect(getTournaments().some((t) => t.id === tourney.id)).toBe(true);

    // Delete the completed tournament as Organizer
    deleteTournament(tourney.id);

    // Verify tournament and its details no longer exist
    expect(getTournaments().some((t) => t.id === tourney.id)).toBe(false);
    expect(getTournamentById(tourney.id)).toBeNull();
  });

  it("registers teams with member names, preserves roster in details, and updates roster", () => {
    setCurrentUserRole("organizer", "Access2026");
    const tourney = createTournament({
      name: "Roster Management Cup",
      description: "Testing team rosters",
      format: "single_elimination",
      participant_type: "team",
      capacity_limit: null,
      registration_status: "open",
      seeding_method: "seeded",
      has_scoring: true,
    });

    // 1. Register team with members
    const teamA = addParticipant(tourney.id, "Team Liquid", "team", undefined, [
      "KuroKy",
      "Miracle-",
      "MinD_ContRoL",
      "GH",
      "MATUMBAMAN",
    ]);

    expect(teamA.roster).toEqual([
      "KuroKy",
      "Miracle-",
      "MinD_ContRoL",
      "GH",
      "MATUMBAMAN",
    ]);

    // 2. Bulk add teams with member syntax
    const bulkResults = bulkAddParticipants(tourney.id, [
      "OG: N0tail, Ana, Topson, Ceb, JerAx",
      "Team Secret",
      "Evil Geniuses (Arteezy, SumaiL, s4, Cr1t-, Fly)",
    ]);

    expect(bulkResults.length).toBe(3);
    const og = bulkResults.find((p) => p.display_name === "OG")!;
    expect(og.roster).toEqual(["N0tail", "Ana", "Topson", "Ceb", "JerAx"]);

    const secret = bulkResults.find((p) => p.display_name === "Team Secret")!;
    expect(secret.roster).toBeUndefined();

    const eg = bulkResults.find((p) => p.display_name === "Evil Geniuses")!;
    expect(eg.roster).toEqual(["Arteezy", "SumaiL", "s4", "Cr1t-", "Fly"]);

    // 3. Verify getTournamentById returns roster
    const details = getTournamentById(tourney.id)!;
    const foundLiquid = details.participants.find((p) => p.id === teamA.id)!;
    expect(foundLiquid.roster?.length).toBe(5);

    // 4. Update team roster
    const updatedLiquid = updateParticipant(teamA.id, {
      display_name: "Team Liquid Prime",
      roster: ["KuroKy", "Miracle-", "Nisha"],
    });
    expect(updatedLiquid.display_name).toBe("Team Liquid Prime");
    expect(updatedLiquid.roster).toEqual(["KuroKy", "Miracle-", "Nisha"]);

    // 5. Generate bracket - verify bracket matches only contain competitor IDs
    const bracketDetails = generateTournamentBracket(tourney.id);
    expect(bracketDetails.matches.length).toBeGreaterThan(0);
    bracketDetails.matches.forEach((m) => {
      // Match itself does not have a roster field
      expect((m as unknown as { roster?: unknown }).roster).toBeUndefined();
    });
    // Participants preserved with rosters
    const liquidInBracket = bracketDetails.participants.find((p) => p.id === teamA.id)!;
    expect(liquidInBracket.roster).toEqual(["KuroKy", "Miracle-", "Nisha"]);
  });
});
