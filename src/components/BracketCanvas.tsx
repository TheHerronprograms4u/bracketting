"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Match, Participant, UserRole } from "@/types/tournament";
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
} from "lucide-react";

interface BracketCanvasProps {
  tournamentId?: string;
  matches: Match[];
  participants: Participant[];
  hasScoring: boolean;
  currentUserRole: UserRole;
  champion: Participant | null;
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
  onSelectWinner,
  onCorrectResult,
  onRenameParticipant,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeMobileRound, setActiveMobileRound] = useState<number>(1);
  const [svgConnectors, setSvgConnectors] = useState<ConnectorLine[]>([]);

  // Map participants by ID for instant O(1) lookups
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Group matches by round number
  const rounds = useMemo(() => {
    if (matches.length === 0) return [];
    const maxRound = Math.max(...matches.map((m) => m.round_number));
    const roundList: { roundNumber: number; name: string; matches: Match[] }[] = [];

    for (let r = 1; r <= maxRound; r++) {
      const roundMatches = matches
        .filter((m) => m.round_number === r)
        .sort((a, b) => a.match_position - b.match_position);

      roundList.push({
        roundNumber: r,
        name: getRoundName(r, maxRound),
        matches: roundMatches,
      });
    }
    return roundList;
  }, [matches]);

  const updateConnectors = useCallback(() => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const lines: ConnectorLine[] = [];

    matches.forEach((match) => {
      if (!match.next_match_id) return;

      const fromEl = boardRef.current?.querySelector(`[data-match-id="${match.id}"]`);
      const toEl = boardRef.current?.querySelector(`[data-match-id="${match.next_match_id}"]`);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Convert DOM coordinates relative to board container
        const startX = (fromRect.right - boardRect.left) / zoomLevel;
        const startY = (fromRect.top + fromRect.height / 2 - boardRect.top) / zoomLevel;

        const endX = (toRect.left - boardRect.left) / zoomLevel;
        // Determine if target slot is top or bottom half of destination card
        const isSlotA = match.next_match_slot === "participant_a";
        const slotOffset = isSlotA ? toRect.height * 0.35 : toRect.height * 0.65;
        const endY = (toRect.top + slotOffset - boardRect.top) / zoomLevel;

        const midX = startX + (endX - startX) * 0.5;

        // Cubic bezier or stepped orthogonal path
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

        // Connector is active if a winner has officially advanced along this path
        const isActive = match.status === "completed" && match.winner_id !== null;

        lines.push({
          id: `${match.id}->${match.next_match_id}`,
          path,
          isActive,
        });
      }
    });

    setSvgConnectors(lines);
  }, [matches, zoomLevel]);

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
      <div className="flex items-center justify-between px-4 py-2.5 bg-arena-card/80 border-b border-arena-border backdrop-blur-sm z-20">
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
            {rounds.find((r) => r.roundNumber === activeMobileRound)?.name}
          </span>
          <button
            onClick={() => setActiveMobileRound((r) => Math.min(rounds.length, r + 1))}
            disabled={activeMobileRound === rounds.length}
            className="p-1.5 rounded-lg bg-arena-elevated border border-arena-border text-arena-muted disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Round Indicators */}
        <div className="hidden md:flex items-center gap-6">
          <span className="text-xs font-bold text-arena-muted uppercase tracking-wider">
            {rounds.length} Elimination Rounds
          </span>
          {champion && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              <Trophy className="w-3.5 h-3.5" />
              <span>Champion: {champion.display_name}</span>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
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
                strokeDasharray={c.isActive ? "none" : "none"}
                className="transition-colors duration-300"
              />
            ))}
          </svg>

          {/* Render Round Columns */}
          {rounds.map((round) => {
            const isChampionshipRound = round.roundNumber === rounds.length;

            return (
              <div
                key={round.roundNumber}
                className={`flex flex-col relative z-10 ${
                  activeMobileRound === round.roundNumber ? "flex" : "hidden md:flex"
                }`}
              >
                {/* Round Header */}
                <div className="mb-6 flex flex-col items-center">
                  <div className="px-4 py-1.5 rounded-full bg-arena-elevated border border-arena-border text-xs font-extrabold uppercase tracking-widest text-arena-text shadow-sm flex items-center gap-1.5">
                    {isChampionshipRound && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
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
                      isChampionship={isChampionshipRound}
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
