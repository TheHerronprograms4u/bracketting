"use client";

import React, { useState } from "react";
import {
  Tournament,
  Participant,
  Match,
  ActivityLog,
  UserRole,
} from "@/types/tournament";
import { calculateTournamentStats } from "@/lib/bracket-engine";
import {
  Users,
  Swords,
  Clock,
  Layers,
  History,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react";

interface TournamentStatsBarProps {
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  activityLogs: ActivityLog[];
  currentUserRole: UserRole;
  onGenerateBracket: () => void;
  onResetTournament: () => void;
}

export const TournamentStatsBar: React.FC<TournamentStatsBarProps> = ({
  tournament,
  participants,
  matches,
  activityLogs,
  currentUserRole,
  onGenerateBracket,
  onResetTournament,
}) => {
  const isOrganizer = currentUserRole === "organizer" || currentUserRole === "admin";
  const stats = calculateTournamentStats(tournament.status, participants, matches);

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const isBracketGenerated = matches.length > 0;
  const canGenerate = participants.length >= 2;

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: Live KPIs & Main Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Participants */}
        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-arena-muted">
              Total Contenders
            </div>
            <div className="text-2xl font-black text-white mt-0.5">
              {stats.totalParticipants}
            </div>
            <div className="text-[11px] text-arena-muted">
              {tournament.capacity_limit
                ? `${tournament.capacity_limit - stats.totalParticipants} slots left`
                : "Unlimited capacity"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-accent">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Matches Played */}
        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-arena-muted">
              Matches Played
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {stats.matchesPlayed}
            </div>
            <div className="text-[11px] text-arena-muted">
              of {stats.totalCompetitiveMatches} competitive
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center text-emerald-400">
            <Swords className="w-5 h-5" />
          </div>
        </div>

        {/* Matches Remaining */}
        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-arena-muted">
              Matches Left
            </div>
            <div className="text-2xl font-black text-white mt-0.5">
              {stats.matchesRemaining}
            </div>
            <div className="text-[11px] text-arena-muted">to crown champion</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-muted">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Current Round */}
        <div className="p-4 rounded-2xl bg-arena-card border border-arena-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-arena-muted">
              Active Stage
            </div>
            <div className="text-2xl font-black text-arena-highlight mt-0.5">
              {tournament.status === "completed"
                ? "Finalized"
                : `Round ${stats.currentRound}`}
            </div>
            <div className="text-[11px] text-arena-muted capitalize">
              {tournament.status.replace("_", " ")}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-highlight">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Progress Bar & Actions */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 p-4 rounded-2xl bg-arena-card border border-arena-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-arena-muted">
              Tournament Progress
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {stats.progressPercentage}%
            </span>
          </div>
          {/* Progress track */}
          <div className="w-full bg-arena-surface h-2 rounded-full overflow-hidden my-2 border border-arena-border/50">
            <div
              style={{ width: `${stats.progressPercentage}%` }}
              className="h-full bg-gradient-to-r from-arena-accent to-arena-highlight transition-all duration-500 rounded-full"
            />
          </div>
          <button
            onClick={() => setIsActivityModalOpen(true)}
            className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-arena-muted hover:text-white transition"
          >
            <History className="w-3.5 h-3.5 text-arena-accent" />
            <span>Activity Stream ({activityLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Organizer Contextual Controls Banner */}
      {isOrganizer && (
        <div className="p-4 rounded-2xl bg-arena-elevated border border-arena-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-arena-accent" />
            <span className="text-xs text-arena-text font-medium">
              {!isBracketGenerated
                ? `Ready to generate single-elimination bracket for ${participants.length} competitors.`
                : tournament.status === "completed"
                ? "Tournament concluded. Champion determined."
                : "Active tournament in progress. Click any ready matchup to advance winners."}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {!isBracketGenerated ? (
              <button
                onClick={onGenerateBracket}
                disabled={!canGenerate}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold transition shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" />
                <span>
                  {canGenerate
                    ? `Generate Dynamic Bracket (${participants.length})`
                    : "Need ≥ 2 Competitors"}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-arena-surface border border-arena-border hover:border-arena-danger hover:text-arena-danger text-arena-muted text-xs font-semibold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Bracket</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-arena-elevated border border-arena-danger/40 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-arena-danger/20 border border-arena-danger/40 flex items-center justify-center text-arena-danger">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Tournament Bracket?</h3>
                <p className="text-xs text-arena-muted">Destructive tournament action</p>
              </div>
            </div>

            <p className="text-xs text-arena-muted mb-6 leading-relaxed">
              This will erase all match records and official results for{" "}
              <strong className="text-white">{tournament.name}</strong>. Registered competitors
              will be preserved so you can edit participants or regenerate the bracket.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetTournament();
                  setIsResetConfirmOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-arena-danger hover:bg-red-500 text-white text-xs font-bold transition shadow-glow-danger"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Stream Modal */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsActivityModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <History className="w-5 h-5 text-arena-accent" />
              <h3 className="text-base font-bold text-white">Tournament Activity Log</h3>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-arena-muted py-6 text-center italic">
                  No activity recorded yet.
                </p>
              ) : (
                activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-arena-surface border border-arena-border/70 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-arena-highlight">{log.action}</span>
                      <span className="text-[10px] text-arena-muted">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-arena-text mb-1">{log.description}</p>
                    <span className="text-[10px] text-arena-muted">
                      By: {log.actor_name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
