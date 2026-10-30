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
  Crosshair,
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
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isActive: boolean;
  isChampionship: boolean;
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
  const [isCentered, setIsCentered] = useState<boolean>(true);

  // Branch filter for Double Elimination: "winners" | "losers" | "grand_finals" | "all"
  const isDoubleElim = format === "double_elimination";
  const [selectedBranch, setSelectedBranch] = useState<"all" | BracketBranch>("winners");

  // Map participants by ID for instant O(1) lookups
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>();
    participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [participants]);

  // Branch counts for Double Elimination tabs
  const branchCounts = useMemo(() => {
    const counts = { winners: 0, losers: 0, grand_finals: 0, all: matches.length };
    matches.forEach((m) => {
      const type = (m.bracket_type || "winners") as keyof typeof counts;
      if (counts[type] !== undefined) {
        counts[type]++;
      }
    });
    return counts;
  }, [matches]);

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

  // Check if board fits entirely within viewport for auto-centering
  const checkCentering = useCallback(() => {
    if (!containerRef.current || !boardRef.current) return;
    const container = containerRef.current;
    const board = boardRef.current;
    setIsCentered(board.scrollWidth <= container.clientWidth);
  }, []);

  // Smoothly center the bracket viewport
  const handleCenterView = useCallback(() => {
    if (!containerRef.current || !boardRef.current) return;
    const container = containerRef.current;
    const board = boardRef.current;
    const targetX = Math.max(0, (board.scrollWidth - container.clientWidth) / 2);
    const targetY = Math.max(0, (board.scrollHeight - container.clientHeight) / 2);
    container.scrollTo({
      left: targetX,
      top: targetY,
      behavior: "smooth",
    });
  }, []);

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
        const isChampionship = toEl.getAttribute("data-is-championship") === "true";

        lines.push({
          id: `${match.id}->${match.next_match_id}`,
          path,
          startX,
          startY,
          endX,
          endY,
          isActive,
          isChampionship,
        });
      }
    });

    setSvgConnectors(lines);
  }, [filteredMatches, zoomLevel]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateConnectors();
      checkCentering();
    }, 120);

    window.addEventListener("resize", updateConnectors);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateConnectors);
    };
  }, [updateConnectors, checkCentering, rounds, zoomLevel]);

  // When changing branches or initially loaded, auto-center view
  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterView();
      checkCentering();
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedBranch, rounds, handleCenterView, checkCentering]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setTimeout(handleCenterView, 50);
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-arena-card border border-arena-border text-center shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-accent mb-4 shadow-inner">
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
    <div className="relative w-full rounded-2xl bg-arena-surface/40 border border-arena-border overflow-hidden shadow-xl">
      {/* Top Floating Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-arena-card/90 border-b border-arena-border backdrop-blur-md z-20">
        {/* Double Elimination Branch Selector */}
        {isDoubleElim ? (
          <div className="flex items-center gap-1.5 bg-arena-surface/80 p-1 rounded-xl border border-arena-border text-xs flex-wrap">
            <button
              onClick={() => setSelectedBranch("winners")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "winners"
                  ? "bg-arena-accent/20 text-arena-highlight border border-arena-accent/40 shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-arena-accent" />
              <span>Upper (Winners)</span>
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-arena-surface border border-arena-border">
                {branchCounts.winners}
              </span>
            </button>

            <button
              onClick={() => setSelectedBranch("losers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "losers"
                  ? "bg-arena-danger/20 text-red-400 border border-arena-danger/40 shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Lower (Losers)</span>
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-arena-surface border border-arena-border">
                {branchCounts.losers}
              </span>
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
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-arena-surface border border-arena-border">
                {branchCounts.grand_finals}
              </span>
            </button>

            <button
              onClick={() => setSelectedBranch("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                selectedBranch === "all"
                  ? "bg-arena-elevated text-white border border-arena-border shadow-sm"
                  : "text-arena-muted hover:text-white"
              }`}
            >
              <span>View All</span>
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-arena-surface border border-arena-border">
                {branchCounts.all}
              </span>
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs font-mono font-bold text-arena-muted uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-arena-accent" />
              Single-Elimination Bracket ({rounds.length} Rounds)
            </span>
            {champion && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full shadow-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
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

        {/* Focus & Zoom Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Center Bracket View Button */}
          <button
            onClick={handleCenterView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-arena-surface border border-arena-border hover:border-arena-accent text-arena-muted hover:text-white transition text-xs font-semibold shadow-sm"
            title="Center bracket in viewport"
          >
            <Crosshair className="w-3.5 h-3.5 text-arena-accent" />
            <span className="hidden sm:inline">Center View</span>
          </button>

          <div className="flex items-center gap-1 bg-arena-surface/80 p-1 rounded-lg border border-arena-border">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded bg-arena-elevated/80 text-arena-muted hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold text-arena-text w-11 text-center select-none">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded bg-arena-elevated/80 text-arena-muted hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded bg-arena-elevated/80 text-arena-muted hover:text-white transition"
              title="Reset Zoom (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bracket Scrolling Canvas with Centralized Flex Viewport */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto overflow-y-auto p-4 sm:p-8 min-h-[660px] max-h-[820px] relative scroll-smooth flex bg-gradient-to-b from-arena-bg via-[#0B1220] to-arena-bg"
      >
        <div
          ref={boardRef}
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
          }}
          className={`${
            isCentered ? "m-auto" : "my-auto mx-4"
          } relative inline-flex gap-14 md:gap-20 items-center justify-center min-w-max py-10 px-8 transition-transform duration-200`}
        >
          {/* Dynamic SVG Connection Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00F0FF" floodOpacity="0.8" />
              </filter>
              <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#F5C518" floodOpacity="0.8" />
              </filter>
              <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00F0FF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
              <linearGradient id="champGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F5C518" />
                <stop offset="100%" stopColor="#FFCF4D" />
              </linearGradient>
            </defs>

            {svgConnectors.map((c) => (
              <g key={c.id}>
                {/* Circuit backdrop shadow line */}
                <path
                  d={c.path}
                  fill="none"
                  stroke="#070E1A"
                  strokeWidth={c.isActive ? 4.5 : 3}
                  strokeLinecap="round"
                />
                {/* Active glowing or inactive circuit line */}
                <path
                  d={c.path}
                  fill="none"
                  stroke={c.isChampionship && c.isActive ? "url(#champGrad)" : c.isActive ? "url(#activeGrad)" : "#1E3060"}
                  strokeWidth={c.isActive ? 2.5 : 1.5}
                  filter={c.isChampionship && c.isActive ? "url(#glow-gold)" : c.isActive ? "url(#glow-cyan)" : undefined}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                {/* Circuit terminal and elbow junction dots */}
                {c.isActive && (
                  <>
                    <circle
                      cx={c.startX}
                      cy={c.startY}
                      r="3"
                      fill={c.isChampionship ? "#F5C518" : "#00F0FF"}
                    />
                    <circle
                      cx={c.endX}
                      cy={c.endY}
                      r="3"
                      fill={c.isChampionship ? "#F5C518" : "#00F0FF"}
                    />
                  </>
                )}
              </g>
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
                    className={`px-4 py-1.5 rounded-full border text-xs font-extrabold uppercase tracking-widest shadow-md flex items-center gap-1.5 backdrop-blur-sm ${
                      isGrandFinals
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : isLosersBranch
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-arena-elevated/80 border-arena-border text-arena-text"
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
                  <span className="text-[10px] text-arena-muted font-mono font-semibold mt-1.5">
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
