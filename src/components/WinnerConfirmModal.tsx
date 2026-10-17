"use client";

import React, { useState } from "react";
import { Match, Participant } from "@/types/tournament";
import { Check, X, Flame } from "lucide-react";

interface WinnerConfirmModalProps {
  isOpen: boolean;
  match: Match;
  proposedWinner: Participant;
  opponent: Participant | null;
  hasScoring: boolean;
  onConfirm: (
    matchId: string,
    winnerId: string,
    scoreA: number | null,
    scoreB: number | null
  ) => void;
  onCancel: () => void;
}

export const WinnerConfirmModal: React.FC<WinnerConfirmModalProps> = ({
  isOpen,
  match,
  proposedWinner,
  opponent,
  hasScoring,
  onConfirm,
  onCancel,
}) => {
  const isWinnerSlotA = match.participant_a_id === proposedWinner.id;

  const [scoreA, setScoreA] = useState<string>(
    match.score_a !== null ? String(match.score_a) : isWinnerSlotA ? "2" : "0"
  );
  const [scoreB, setScoreB] = useState<string>(
    match.score_b !== null ? String(match.score_b) : isWinnerSlotA ? "0" : "2"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const parsedA = hasScoring && scoreA !== "" ? parseInt(scoreA, 10) : null;
    const parsedB = hasScoring && scoreB !== "" ? parseInt(scoreB, 10) : null;

    onConfirm(match.id, proposedWinner.id, isNaN(parsedA ?? NaN) ? null : parsedA, isNaN(parsedB ?? NaN) ? null : parsedB);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-arena-accent/20 border border-arena-accent flex items-center justify-center text-arena-highlight shadow-glow-sm">
            <Flame className="w-5 h-5 text-arena-accent" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Confirm Match Result</h3>
            <p className="text-xs text-arena-muted">
              Select and confirm the advancing competitor.
            </p>
          </div>
        </div>

        {/* Competitor Matchup Card */}
        <div className="p-4 rounded-xl bg-arena-surface border border-arena-border/80 mb-5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-arena-muted mb-2">
            PROPOSED VICTOR
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-arena-accent/15 border border-arena-accent/40 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-arena-accent/30 text-arena-highlight font-bold text-xs flex items-center justify-center">
                {proposedWinner.seed ?? "•"}
              </span>
              <span className="text-sm font-extrabold text-white">
                {proposedWinner.display_name}
              </span>
            </div>
            <span className="text-xs font-bold text-arena-accent uppercase tracking-wider">
              WINNER
            </span>
          </div>

          {opponent && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-arena-elevated border border-arena-border opacity-70">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-arena-surface text-arena-muted font-bold text-xs flex items-center justify-center">
                  {opponent.seed ?? "•"}
                </span>
                <span className="text-xs font-medium text-arena-muted line-through">
                  {opponent.display_name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-arena-danger uppercase">
                ELIMINATED
              </span>
            </div>
          )}
        </div>

        {/* Optional Scoring */}
        {hasScoring && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-arena-muted mb-2">
              Match Scores (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-arena-muted truncate mb-1">
                  {proposedWinner.display_name}
                </span>
                <input
                  type="number"
                  min="0"
                  value={isWinnerSlotA ? scoreA : scoreB}
                  onChange={(e) =>
                    isWinnerSlotA ? setScoreA(e.target.value) : setScoreB(e.target.value)
                  }
                  className="w-full px-3 py-2 bg-arena-surface border border-arena-border rounded-lg text-white font-mono text-sm focus:border-arena-accent outline-none"
                />
              </div>

              {opponent && (
                <div>
                  <span className="block text-[11px] text-arena-muted truncate mb-1">
                    {opponent.display_name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={isWinnerSlotA ? scoreB : scoreA}
                    onChange={(e) =>
                      isWinnerSlotA ? setScoreB(e.target.value) : setScoreA(e.target.value)
                    }
                    className="w-full px-3 py-2 bg-arena-surface border border-arena-border rounded-lg text-white font-mono text-sm focus:border-arena-accent outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-arena-muted hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Confirming...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Advance Winner</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
