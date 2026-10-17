"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getTournamentById,
  generateTournamentBracket,
  recordMatchWinner,
  correctMatchResult,
  resetTournament,
  addParticipant,
  bulkAddParticipants,
  updateParticipantName,
  removeParticipant,
  getCurrentUser,
} from "@/lib/storage";
import {
  TournamentDetails,
  Match,
  Participant,
  UserRole,
} from "@/types/tournament";
import { Navbar } from "@/components/Navbar";
import { BracketCanvas } from "@/components/BracketCanvas";
import { TournamentStatsBar } from "@/components/TournamentStatsBar";
import { ParticipantManager } from "@/components/ParticipantManager";
import { EliminationCinematic } from "@/components/EliminationCinematic";
import { ChampionshipFinale } from "@/components/ChampionshipFinale";
import { WinnerConfirmModal } from "@/components/WinnerConfirmModal";
import { ResultCorrectionModal } from "@/components/ResultCorrectionModal";
import { getRoundName } from "@/lib/bracket-engine";
import {
  Trophy,
  ArrowLeft,
  Layers,
  Users,
  Shield,
  AlertCircle,
} from "lucide-react";

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params?.id as string;

  const [details, setDetails] = useState<TournamentDetails | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>("organizer");
  const [activeTab, setActiveTab] = useState<"bracket" | "participants" | "settings">("bracket");

  // Cinematic Winner Elimination State
  const [isCinematicOpen, setIsCinematicOpen] = useState(false);
  const [cinematicWinner, setCinematicWinner] = useState<Participant | null>(null);
  const [cinematicLoser, setCinematicLoser] = useState<Participant | null>(null);
  const [cinematicRoundName, setCinematicRoundName] = useState("");
  const [cinematicIsChampionship, setCinematicIsChampionship] = useState(false);
  const [cinematicScoreA, setCinematicScoreA] = useState<number | null>(null);
  const [cinematicScoreB, setCinematicScoreB] = useState<number | null>(null);

  // Championship Finale Modal State
  const [isFinaleOpen, setIsFinaleOpen] = useState(false);

  // Selection Confirmation Modal State
  const [confirmMatch, setConfirmMatch] = useState<Match | null>(null);
  const [confirmWinner, setConfirmWinner] = useState<Participant | null>(null);
  const [confirmOpponent, setConfirmOpponent] = useState<Participant | null>(null);

  // Result Correction Modal State
  const [correctingMatch, setCorrectingMatch] = useState<Match | null>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(() => {
    if (!tournamentId) return;
    const data = getTournamentById(tournamentId);
    if (data) {
      setDetails(data);
    }
    const user = getCurrentUser();
    setCurrentUserRole(user.role);
  }, [tournamentId]);

  useEffect(() => {
    loadData();

    const handleRoleChanged = () => {
      const user = getCurrentUser();
      setCurrentUserRole(user.role);
    };

    window.addEventListener("arena_role_changed", handleRoleChanged);
    return () => window.removeEventListener("arena_role_changed", handleRoleChanged);
  }, [loadData]);

  if (!details) {
    return (
      <div className="min-h-screen bg-arena-bg text-arena-text">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-arena-elevated border border-arena-border flex items-center justify-center mx-auto mb-4 text-arena-muted">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Tournament Not Found</h2>
          <p className="text-sm text-arena-muted mb-6">
            The requested tournament ID does not exist or has been removed.
          </p>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-arena-accent text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const { tournament, participants, matches, champion, activity_logs } = details;
  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.round_number)) : 0;

  // 1. Bracket Generation
  const handleGenerateBracket = () => {
    try {
      const updated = generateTournamentBracket(tournament.id);
      setDetails(updated);
      showToast(`Dynamic bracket generated for ${updated.participants.length} competitors!`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to generate bracket.");
    }
  };

  // 2. Winner Selection Trigger from MatchCard
  const handleSelectWinner = (
    match: Match,
    proposedWinner: Participant,
    opponent: Participant | null
  ) => {
    setConfirmMatch(match);
    setConfirmWinner(proposedWinner);
    setConfirmOpponent(opponent);
  };

  // 3. Confirm Match Result -> Atomically Save -> Trigger Cinematic Animation
  const handleConfirmResult = (
    matchId: string,
    winnerId: string,
    scoreA: number | null,
    scoreB: number | null
  ) => {
    try {
      const { details: updated, isChampionshipWin } = recordMatchWinner(
        tournament.id,
        matchId,
        winnerId,
        scoreA,
        scoreB
      );

      // Close confirmation modal
      const curMatch = confirmMatch;
      const curWinner = confirmWinner;
      const curOpponent = confirmOpponent;

      setConfirmMatch(null);
      setConfirmWinner(null);
      setConfirmOpponent(null);

      // Set tournament details
      setDetails(updated);

      // Trigger Signature Cinematic Winner-Crushing-Loser Animation!
      if (curWinner) {
        setCinematicWinner(curWinner);
        setCinematicLoser(curOpponent);
        setCinematicRoundName(
          curMatch ? getRoundName(curMatch.round_number, totalRounds) : "Elimination Round"
        );
        setCinematicIsChampionship(isChampionshipWin);
        setCinematicScoreA(scoreA);
        setCinematicScoreB(scoreB);
        setIsCinematicOpen(true);
      }

      // If it was the championship match, also queue the grand finale reveal
      if (isChampionshipWin) {
        setTimeout(() => {
          setIsFinaleOpen(true);
        }, 5800);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to record match result.");
    }
  };

  // 4. Result Correction Trigger from MatchCard
  const handleCorrectResultTrigger = (match: Match) => {
    setCorrectingMatch(match);
  };

  // 5. Confirm Result Correction
  const handleConfirmCorrection = (
    matchId: string,
    newWinnerId: string,
    scoreA: number | null,
    scoreB: number | null
  ) => {
    try {
      const updated = correctMatchResult(
        tournament.id,
        matchId,
        newWinnerId,
        scoreA,
        scoreB
      );
      setDetails(updated);
      setCorrectingMatch(null);
      showToast("Match result corrected. Downstream dependencies safely recalculated.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to correct match result.");
    }
  };

  // 6. Reset Tournament
  const handleResetTournament = () => {
    try {
      const updated = resetTournament(tournament.id);
      setDetails(updated);
      showToast("Tournament bracket reset. Roster preserved.");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to reset tournament.");
    }
  };

  // 7. Participant Roster Actions
  const handleAddParticipant = (name: string, seed?: number) => {
    addParticipant(tournament.id, name, tournament.participant_type, seed);
    loadData();
    showToast(`Registered "${name}" into tournament.`);
  };

  const handleBulkAdd = (names: string[]) => {
    const added = bulkAddParticipants(tournament.id, names);
    loadData();
    showToast(`Bulk imported ${added.length} competitors.`);
  };

  const handleRename = (id: string, newName: string) => {
    updateParticipantName(id, newName);
    loadData();
    showToast(`Renamed competitor to "${newName}".`);
  };

  const handleRemove = (id: string) => {
    removeParticipant(id);
    loadData();
    showToast("Competitor removed from tournament.");
  };

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text pb-20">
      <Navbar />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-arena-elevated border border-arena-accent/50 text-white text-xs font-semibold shadow-glow animate-in slide-in-from-bottom-5">
          {toastMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-arena-muted hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Tournaments</span>
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                tournament.status === "completed"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : tournament.status === "in_progress"
                  ? "bg-arena-accent/15 text-arena-highlight border border-arena-accent/30"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {tournament.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Tournament Hero Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-arena-card via-arena-elevated to-arena-bg border border-arena-border p-6 md:p-8 shadow-sm overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial-glow pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold text-arena-highlight uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5" />
                <span>Single Elimination Championship</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {tournament.name}
              </h1>
              <p className="text-sm text-arena-muted line-clamp-2">
                {tournament.description || "Every Match Matters in the Arena."}
              </p>
            </div>

            {/* Champion Banner if completed */}
            {champion && (
              <div
                onClick={() => setIsFinaleOpen(true)}
                className="cursor-pointer flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/40 hover:border-amber-500 transition shadow-lg group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    TOURNAMENT CHAMPION
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {champion.display_name}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Stats and Controls Bar */}
        <TournamentStatsBar
          tournament={tournament}
          participants={participants}
          matches={matches}
          activityLogs={activity_logs}
          currentUserRole={currentUserRole}
          onGenerateBracket={handleGenerateBracket}
          onResetTournament={handleResetTournament}
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-arena-border/80 pb-2">
          <button
            onClick={() => setActiveTab("bracket")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
              activeTab === "bracket"
                ? "bg-arena-elevated text-white border border-arena-border shadow-sm"
                : "text-arena-muted hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 text-arena-accent" />
            <span>Interactive Bracket</span>
          </button>

          <button
            onClick={() => setActiveTab("participants")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition ${
              activeTab === "participants"
                ? "bg-arena-elevated text-white border border-arena-border shadow-sm"
                : "text-arena-muted hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-arena-accent" />
            <span>Competitors & Roster ({participants.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "bracket" && (
          <BracketCanvas
            tournamentId={tournament.id}
            matches={matches}
            participants={participants}
            hasScoring={tournament.has_scoring}
            currentUserRole={currentUserRole}
            champion={champion}
            onSelectWinner={handleSelectWinner}
            onCorrectResult={handleCorrectResultTrigger}
            onRenameParticipant={handleRename}
          />
        )}

        {activeTab === "participants" && (
          <ParticipantManager
            tournament={tournament}
            participants={participants}
            currentUserRole={currentUserRole}
            isLocked={matches.length > 0}
            onAddParticipant={handleAddParticipant}
            onBulkAddParticipants={handleBulkAdd}
            onRenameParticipant={handleRename}
            onRemoveParticipant={handleRemove}
          />
        )}
      </main>

      {/* Winner Selection Confirmation Modal */}
      {confirmMatch && confirmWinner && (
        <WinnerConfirmModal
          isOpen={Boolean(confirmMatch)}
          match={confirmMatch}
          proposedWinner={confirmWinner}
          opponent={confirmOpponent}
          hasScoring={tournament.has_scoring}
          onConfirm={handleConfirmResult}
          onCancel={() => {
            setConfirmMatch(null);
            setConfirmWinner(null);
            setConfirmOpponent(null);
          }}
        />
      )}

      {/* Result Correction Modal */}
      {correctingMatch && (
        <ResultCorrectionModal
          isOpen={Boolean(correctingMatch)}
          match={correctingMatch}
          participantA={
            participants.find((p) => p.id === correctingMatch.participant_a_id) || null
          }
          participantB={
            participants.find((p) => p.id === correctingMatch.participant_b_id) || null
          }
          allMatches={matches}
          onConfirmCorrection={handleConfirmCorrection}
          onCancel={() => setCorrectingMatch(null)}
        />
      )}

      {/* Signature Cinematic Elimination Animation */}
      {cinematicWinner && (
        <EliminationCinematic
          isOpen={isCinematicOpen}
          winner={cinematicWinner}
          loser={cinematicLoser}
          roundName={cinematicRoundName}
          isChampionship={cinematicIsChampionship}
          scoreA={cinematicScoreA}
          scoreB={cinematicScoreB}
          onClose={() => setIsCinematicOpen(false)}
        />
      )}

      {/* Championship Finale Modal */}
      {champion && (
        <ChampionshipFinale
          isOpen={isFinaleOpen}
          tournament={tournament}
          champion={champion}
          matches={matches}
          participants={participants}
          onClose={() => setIsFinaleOpen(false)}
        />
      )}
    </div>
  );
}
