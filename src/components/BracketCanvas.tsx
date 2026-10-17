"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Match, Participant, UserRole, TournamentFormat, BracketBranch } from "@/types/tournament";
import { MatchCard } from "./MatchCard";
import { getRoundName } from "@/lib/bracket-engine";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trophy,
  Layers,
  ChevronLeft,
  ChevronRight,
  Shield,
  Flame,
} from "lucide-react";

interface BracketCanvasProps {
  tournamentId?: string;
  matches: Match[];
  participants: Participant[];
  hasScoring: boolean;
  currentUserRole: UserRole;
  champion: Participant | null;
  format?: TournamentFormat;
  onSelectWinner: (match: Match, proposedWinner: Participant, opponent: Participant | null) => void;
  onCorrectResult: (match: Match) => void;
  onRenameParticipant: (participantId: string, newName: string) => void;
}

interface ConnectorLine {
  id: string;
  path: string;
  isActive: boolean;
}

export const BracketCanvas: React.FC<BracketCanvasProps> = ({
  matches,
  participants,
  hasScoring,
  currentUserRole,
  champion,
  format = "single_elimination",
  onSelectWinner,
  onCorrectResult,
  onRenameParticipant,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeMobileRound, setActiveMobileRound] = useState<number>(1);
  const [svgConnectors, setSvgConnectors] = useState<ConnectorLine[]>([]);

  // Branch filter for Double Elimination: "winners" | "losers" | "grand_finals" | "all"
  const isDoubleElim = format === "double_elimination";
  const [selectedBranch, setSelectedBranch] = useState<"all" | BracketBranch>("winners");

  // Map participants by ID for instant O(1) lookups
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Filter matches according to selected branch
  const filteredMatches = useMemo(() => {
    if (!isDoubleElim || selectedBranch === "all") {
      return matches;
    }
    return matches.filter((m) => (m.bracket_type || "winners") === selectedBranch);
  }, [matches, isDoubleElim, selectedBranch]);

  // Group filtered matches by round number
  const rounds = useMemo(() => {
    if (filteredMatches.length === 0) return [];
    const maxRound = Math.max(...filteredMatches.map((m) => m.round_number));
    const roundList: {
      roundNumber: number;
      name: string;
      bracketType: BracketBranch;
      matches: Match[];
    }[] = [];

    for (let r = 1; r <= maxRound; r++) {
      const roundMatches = filteredMatches
        .filter((m) => m.round_number === r)
        .sort((a, b) => a.match_position - b.match_position);

      if (roundMatches.length > 0) {
        const bType = roundMatches[0].bracket_type || "winners";
        roundList.push({
          roundNumber: r,
          name: getRoundName(r, maxRound, bType, format),
          bracketType: bType,
          matches: roundMatches,
        });
      }
    }
    return roundList;
  }, [filteredMatches, format]);

  // Compute dynamic SVG connecting lines between parent matches and next matches
  const updateConnectors = useCallback(() => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const lines: ConnectorLine[] = [];

    filteredMatches.forEach((match) => {
      if (!match.next_match_id) return;

      const fromEl = boardRef.current?.querySelector(`[data-match-id="${match.id}"]`);
      const toEl = boardRef.current?.querySelector(`[data-match-id="${match.next_match_id}"]`);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const startX = (fromRect.right - boardRect.left) / zoomLevel;
        const startY = (fromRect.top + fromRect.height / 2 - boardRect.top) / zoomLevel;

        const endX = (toRect.left - boardRect.left) / zoomLevel;
        const isSlotA = match.next_match_slot === "participant_a";
        const slotOffset = isSlotA ? toRect.height * 0.35 : toRect.height * 0.65;
        const endY = (toRect.top + slotOffset - boardRect.top) / zoomLevel;

        const midX = startX + (endX - startX) * 0.5;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        const isActive = match.status === "completed" && match.winner_id !== null;

        lines.push({
          id: `${match.id}->${match.next_match_id}`,
          path,
          isActive,
        });
      }
    });

    setSvgConnectors(lines);
  }, [filteredMatches, zoomLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateConnectors();
    }, 150);

    window.addEventListener("resize", updateConnectors);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateConnectors);
    };
  }, [updateConnectors, rounds]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))));
  const handleResetZoom = () => setZoomLevel(1);

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-arena-card border border-arena-border text-center">
        <div className="w-14 h-14 rounded-2xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-muted mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Bracket Not Yet Generated</h3>
        <p className="text-sm text-arena-muted max-w-sm">
          {currentUserRole === "organizer" || currentUserRole === "admin"
            ? "When ready, generate the dynamic bracket above to compute pairings, byes, and tournament progression."
            : "The organizer has not generated the tournament bracket yet. Check back soon!"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl bg-arena-surface/40 border border-arena-border overflow-hidden">
      {/* Top Floating Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-arena-card/85 border-b border-arena-border backdrop-blur-sm z-20">
        {/* Double Elimination Branch Selector */}
        {isDoubleElim ? (
          <div className="flex items-center gap-1.5 bg-arena-surface p-1 rounded-xl border border-arena-border text-xs flex-wrap">
            <button
              onClick={() => setSelectedBranch("winners")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "winners"
                  ? "bg-arena-accent/20 text-arena-highlight border border-arena-accent/40 shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Upper (Winners) Bracket</span>
            </button>

            <button
              onClick={() => setSelectedBranch("losers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "losers"
                  ? "bg-arena-danger/20 text-red-400 border border-arena-danger/40 shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Lower (Losers) Bracket</span>
            </button>

            <button
              onClick={() => setSelectedBranch("grand_finals")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "grand_finals"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Grand Finals</span>
            </button>

            <button
              onClick={() => setSelectedBranch("all")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "all"
                  ? "bg-arena-elevated text-white border border-arena-border shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <span>View All</span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6">
            <span className="text-xs font-bold text-arena-muted uppercase tracking-wider">
              {rounds.length} Single Elimination Rounds
            </span>
            {champion && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                <Trophy className="w-3.5 h-3.5" />
                <span>Champion: {champion.display_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Mobile Round Switcher */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setActiveMobileRound((r) => Math.max(1, r - 1))}
            disabled={activeMobileRound === 1}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-arena-text">
            {rounds.find((r) => r.roundNumber === activeMobileRound)?.name || "Round"}
          </span>
          <button
            onClick={() => setActiveMobileRound((r) => Math.min(rounds.length, r + 1))}
            disabled={activeMobileRound === rounds.length}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-arena-muted w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted hover:text-white transition text-xs"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bracket Scrolling Canvas */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-auto p-8 min-h-[620px] max-h-[750px] relative scroll-smooth"
      >
        <div
          ref={boardRef}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "top left",
          }}
          className="relative inline-flex gap-16 md:gap-24 items-stretch min-w-max pb-8"
        >
          {/* Dynamic SVG Connection Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {svgConnectors.map((c) => (
              <path
                key={c.id}
                d={c.path}
                fill="none"
                stroke={c.isActive ? "#8B5CF6" : "#292932"}
                strokeWidth={c.isActive ? 2.5 : 1.5}
                className="transition-colors duration-300"
              />
            ))}
          </svg>

          {/* Render Round Columns */}
          {rounds.map((round) => {
            const isGrandFinals = round.bracketType === "grand_finals";
            const isLosersBranch = round.bracketType === "losers";

            return (
              <div
                key={`${round.bracketType}_${round.roundNumber}`}
                className={`flex flex-col relative z-10 ${
                  activeMobileRound === round.roundNumber ? "flex" : "hidden md:flex"
                }`}
              >
                {/* Round Header */}
                <div className="mb-6 flex flex-col items-center">
                  <div
                    className={`px-4 py-1.5 rounded-full border text-xs font-extrabold uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${
                      isGrandFinals
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : isLosersBranch
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-arena-elevated border-arena-border text-arena-text"
                    }`}
                  >
                    {isGrandFinals ? (
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    ) : isLosersBranch ? (
                      <Flame className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-arena-accent" />
                    )}
                    <span>{round.name}</span>
                  </div>
                  <span className="text-[10px] text-arena-muted font-semibold mt-1">
                    {round.matches.length} {round.matches.length === 1 ? "Match" : "Matches"}
                  </span>
                </div>

                {/* Match Cards spaced evenly vertically */}
                <div className="flex-1 flex flex-col justify-around gap-8 md:gap-12">
                  {round.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      participantA={
                        match.participant_a_id
                          ? participantMap.get(match.participant_a_id) || null
                          : null
                      }
                      participantB={
                        match.participant_b_id
                          ? participantMap.get(match.participant_b_id) || null
                          : null
                      }
                      hasScoring={hasScoring}
                      currentUserRole={currentUserRole}
                      isChampionship={isGrandFinals || (!isDoubleElim && round.roundNumber === rounds.length)}
                      onSelectWinner={onSelectWinner}
                      onCorrectResult={onCorrectResult}
                      onRenameParticipant={onRenameParticipant}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
