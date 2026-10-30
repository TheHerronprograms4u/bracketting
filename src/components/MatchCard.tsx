"use client";

import React, { useState } from "react";
import { Match, Participant, UserRole } from "@/types/tournament";
import {
  Trophy,
  CheckCircle2,
  Clock,
  Edit2,
  Check,
  X,
  RotateCcw,
} from "lucide-react";

interface MatchCardProps {
  match: Match;
  participantA: Participant | null;
  participantB: Participant | null;
  hasScoring: boolean;
  currentUserRole: UserRole;
  isChampionship?: boolean;
  onSelectWinner: (match: Match, proposedWinner: Participant, opponent: Participant | null) => void;
  onCorrectResult: (match: Match) => void;
  onRenameParticipant: (participantId: string, newName: string) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  participantA,
  participantB,
  hasScoring,
  currentUserRole,
  isChampionship = false,
  onSelectWinner,
  onCorrectResult,
  onRenameParticipant,
}) => {
  const isOrganizer = currentUserRole === "organizer" || currentUserRole === "admin";
  const isBye = match.is_bye;
  const isCompleted = match.status === "completed";
  const isReady = match.status === "ready";
  const isPending = match.status === "pending";

  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartRename = (e: React.MouseEvent, p: Participant) => {
    e.stopPropagation();
    setEditingParticipantId(p.id);
    setEditingName(p.display_name);
  };

  const handleSaveRename = (e: React.MouseEvent, pId: string) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onRenameParticipant(pId, editingName.trim());
    }
    setEditingParticipantId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingParticipantId(null);
  };

  const handleSlotClick = (participant: Participant | null, opponent: Participant | null) => {
    if (!isOrganizer) return;
    if (!participant || isCompleted || isBye || !isReady) return;
    onSelectWinner(match, participant, opponent);
  };

  return (
    <div
      data-match-id={match.id}
      data-is-championship={isChampionship ? "true" : "false"}
      className={`group relative w-64 md:w-72 rounded-xl transition-all duration-300 select-none overflow-hidden backdrop-blur-md shadow-md ${
        isChampionship
          ? "border-2 border-amber-500/80 shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)] bg-gradient-to-b from-arena-card via-arena-elevated to-arena-card"
          : isCompleted
          ? "border border-arena-border/80 bg-arena-card/90 hover:border-arena-borderLight"
          : isReady
          ? "border-2 border-arena-accent/90 shadow-glow-sm bg-arena-card/95 ring-1 ring-arena-accent/30 hover:shadow-glow hover:border-arena-accent"
          : isBye
          ? "border border-arena-border/40 bg-arena-surface/40 opacity-75"
          : "border border-arena-border/30 bg-arena-surface/50 opacity-60"
      }`}
    >
      {/* Top Header Label */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-arena-border/40 text-[10px] font-mono font-semibold text-arena-muted bg-arena-surface/50">
        <span className="flex items-center gap-1.5 tracking-wider">
          {isChampionship && <Trophy className="w-3 h-3 text-amber-400" />}
          <span className={isChampionship ? "text-amber-400 font-bold" : ""}>
            {isChampionship ? "CHAMPIONSHIP" : `MATCH ${match.match_position + 1}`}
          </span>
          {match.bracket_type && match.bracket_type !== "grand_finals" && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-arena-elevated/80 text-arena-muted uppercase">
              {match.bracket_type === "winners" ? "Upper" : "Lower"}
            </span>
          )}
        </span>

        {/* Status Badge */}
        {isCompleted && (
          <span className="text-arena-highlight flex items-center gap-1 font-bold text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-arena-accent" />
            <span>FINAL</span>
          </span>
        )}
        {isReady && (
          <span className="text-emerald-400 flex items-center gap-1.5 font-bold text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>READY</span>
          </span>
        )}
        {isBye && (
          <span className="text-arena-muted font-bold tracking-wider text-[10px]">
            BYE ADVANCE
          </span>
        )}
        {isPending && (
          <span className="text-arena-muted/70 flex items-center gap-1 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>WAITING</span>
          </span>
        )}
      </div>

      {/* Slot A */}
      <div
        onClick={() => handleSlotClick(participantA, participantB)}
        className={`relative flex items-center justify-between px-3 py-2.5 transition-colors border-b border-arena-border/30 ${
          isReady && isOrganizer
            ? "cursor-pointer hover:bg-arena-accent/15 group/slot active:scale-[0.99]"
            : ""
        } ${
          match.winner_id === participantA?.id
            ? "bg-arena-accent/15 text-white font-bold border-l-2 border-l-arena-accent"
            : isCompleted && participantA
            ? "opacity-45 text-arena-muted line-through"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {/* Seed badge */}
          {participantA && (
            <span
              className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-mono font-bold ${
                match.winner_id === participantA?.id
                  ? "bg-arena-accent/25 border-arena-accent/50 text-arena-highlight"
                  : "bg-arena-surface border-arena-border text-arena-muted"
              }`}
            >
              {participantA.seed ?? "-"}
            </span>
          )}

          {/* Inline Edit or Display Name */}
          {editingParticipantId === participantA?.id ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-2 py-0.5 text-xs bg-arena-surface border border-arena-accent rounded text-white outline-none"
                autoFocus
              />
              <button
                onClick={(e) => handleSaveRename(e, participantA.id)}
                className="p-1 hover:text-emerald-400 text-arena-muted"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:text-red-400 text-arena-muted"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span
              className={`truncate text-xs ${
                match.winner_id === participantA?.id
                  ? "text-white font-bold"
                  : participantA
                  ? "text-arena-text"
                  : "text-arena-muted italic"
              }`}
            >
              {participantA?.display_name || (isBye ? "Automatic Bye" : "To Be Decided")}
            </span>
          )}

          {/* Organizer Rename Action */}
          {isOrganizer && participantA && editingParticipantId !== participantA.id && (
            <button
              onClick={(e) => handleStartRename(e, participantA)}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 text-arena-muted hover:text-white transition"
              title="Edit name"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Score or Check Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasScoring && match.score_a !== null && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                match.winner_id === participantA?.id
                  ? "bg-arena-accent text-white"
                  : "bg-arena-surface text-arena-muted"
              }`}
            >
              {match.score_a}
            </span>
          )}
          {match.winner_id === participantA?.id && (
            <CheckCircle2 className="w-4 h-4 text-arena-accent" />
          )}
        </div>
      </div>

      {/* Slot B */}
      <div
        onClick={() => handleSlotClick(participantB, participantA)}
        className={`relative flex items-center justify-between px-3 py-2.5 transition-colors ${
          isReady && isOrganizer
            ? "cursor-pointer hover:bg-arena-accent/15 group/slot active:scale-[0.99]"
            : ""
        } ${
          match.winner_id === participantB?.id
            ? "bg-arena-accent/15 text-white font-bold border-l-2 border-l-arena-accent"
            : isCompleted && participantB
            ? "opacity-45 text-arena-muted line-through"
            : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {/* Seed badge */}
          {participantB && (
            <span
              className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center text-[10px] font-mono font-bold ${
                match.winner_id === participantB?.id
                  ? "bg-arena-accent/25 border-arena-accent/50 text-arena-highlight"
                  : "bg-arena-surface border-arena-border text-arena-muted"
              }`}
            >
              {participantB.seed ?? "-"}
            </span>
          )}

          {/* Inline Edit or Display Name */}
          {editingParticipantId === participantB?.id ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="w-full px-2 py-0.5 text-xs bg-arena-surface border border-arena-accent rounded text-white outline-none"
                autoFocus
              />
              <button
                onClick={(e) => handleSaveRename(e, participantB.id)}
                className="p-1 hover:text-emerald-400 text-arena-muted"
                title="Save name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:text-red-400 text-arena-muted"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span
              className={`truncate text-xs ${
                match.winner_id === participantB?.id
                  ? "text-white font-bold"
                  : participantB
                  ? "text-arena-text"
                  : isBye
                  ? "text-arena-muted/70 italic text-[11px]"
                  : "text-arena-muted italic"
              }`}
            >
              {participantB?.display_name || (isBye ? "Automatic Bye Slot" : "To Be Decided")}
            </span>
          )}

          {/* Organizer Rename Action */}
          {isOrganizer && participantB && editingParticipantId !== participantB.id && (
            <button
              onClick={(e) => handleStartRename(e, participantB)}
              className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 text-arena-muted hover:text-white transition"
              title="Edit name"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Score or Check Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasScoring && match.score_b !== null && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                match.winner_id === participantB?.id
                  ? "bg-arena-accent text-white"
                  : "bg-arena-surface text-arena-muted"
              }`}
            >
              {match.score_b}
            </span>
          )}
          {match.winner_id === participantB?.id && (
            <CheckCircle2 className="w-4 h-4 text-arena-accent" />
          )}
        </div>
      </div>

      {/* Organizer Quick Actions Footer (e.g. Correct Result) */}
      {isOrganizer && isCompleted && !isBye && (
        <div className="flex items-center justify-end px-3 py-1 bg-arena-surface/40 border-t border-arena-border/30">
          <button
            onClick={() => onCorrectResult(match)}
            className="flex items-center gap-1 text-[10px] text-arena-muted hover:text-amber-400 transition"
            title="Correct official match result"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Correct Result</span>
          </button>
        </div>
      )}
    </div>
  );
};
