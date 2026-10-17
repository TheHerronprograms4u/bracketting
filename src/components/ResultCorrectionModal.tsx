"use client";

import React, { useState } from "react";
import { Match, Participant } from "@/types/tournament";
import { AlertTriangle, RotateCcw, X } from "lucide-react";

interface ResultCorrectionModalProps {
  isOpen: boolean;
  match: Match;
  participantA: Participant | null;
  participantB: Participant | null;
  allMatches: Match[];
  onConfirmCorrection: (
    matchId: string,
    newWinnerId: string,
    scoreA: number | null,
    scoreB: number | null
  ) => void;
  onCancel: () => void;
}

export const ResultCorrectionModal: React.FC<ResultCorrectionModalProps> = ({
  isOpen,
  match,
  participantA,
  participantB,
  allMatches,
  onConfirmCorrection,
  onCancel,
}) => {
  const currentWinnerId = match.winner_id;
  const oppositeParticipant =
    currentWinnerId === participantA?.id ? participantB : participantA;

  const [selectedNewWinnerId, setSelectedNewWinnerId] = useState<string>(
    oppositeParticipant ? oppositeParticipant.id : ""
  );
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);

  if (!isOpen || !participantA || !participantB) return null;

  // Calculate downstream matches that will be reset
  const downstreamImpactedCount: number = (() => {
    let count = 0;
    let curr: Match | undefined = match;
    while (curr && curr.next_match_id) {
      const nextMatch = allMatches.find((m) => m.id === curr!.next_match_id);
      if (nextMatch) {
        if (nextMatch.status === "completed" || nextMatch.winner_id !== null) {
          count++;
        }
        curr = nextMatch;
      } else {
        break;
      }
    }
    return count;
  })();

  const handleConfirm = () => {
    if (!selectedNewWinnerId || !hasConfirmedCheckbox) return;
    onConfirmCorrection(match.id, selectedNewWinnerId, null, null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-arena-bg/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-arena-elevated border border-amber-500/40 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Correct Match Result</h3>
            <p className="text-xs text-amber-400">
              Downstream bracket recalculation required
            </p>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-5 text-xs text-amber-200 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              Downstream Invalidation Safeguard
            </p>
            <p className="text-arena-muted">
              Changing this result will reassign the advancing competitor.{" "}
              {downstreamImpactedCount > 0 ? (
                <span className="text-amber-300 font-bold">
                  {downstreamImpactedCount} later match(es) that depended on the
                  previous winner will be safely reset.
                </span>
              ) : (
                "The subsequent round will be updated with the corrected winner."
              )}
            </p>
          </div>
        </div>

        {/* Competitor Selection */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-semibold text-arena-muted">
            Select the Correct Official Winner:
          </label>

          <label
            onClick={() => setSelectedNewWinnerId(participantA.id)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
              selectedNewWinnerId === participantA.id
                ? "bg-arena-accent/20 border-arena-accent text-white"
                : "bg-arena-surface border-arena-border text-arena-muted hover:border-arena-borderLight"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-arena-surface border border-arena-border text-xs flex items-center justify-center font-bold">
                {participantA.seed ?? 1}
              </span>
              <span className="font-bold text-xs">{participantA.display_name}</span>
            </div>
            {currentWinnerId === participantA.id && (
              <span className="text-[10px] text-arena-muted uppercase font-semibold">
                (Current Recorded Winner)
              </span>
            )}
          </label>

          <label
            onClick={() => setSelectedNewWinnerId(participantB.id)}
            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
              selectedNewWinnerId === participantB.id
                ? "bg-arena-accent/20 border-arena-accent text-white"
                : "bg-arena-surface border-arena-border text-arena-muted hover:border-arena-borderLight"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-arena-surface border border-arena-border text-xs flex items-center justify-center font-bold">
                {participantB.seed ?? 2}
              </span>
              <span className="font-bold text-xs">{participantB.display_name}</span>
            </div>
            {currentWinnerId === participantB.id && (
              <span className="text-[10px] text-arena-muted uppercase font-semibold">
                (Current Recorded Winner)
              </span>
            )}
          </label>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-arena-surface border border-arena-border mb-6">
          <input
            type="checkbox"
            id="confirmCorrection"
            checked={hasConfirmedCheckbox}
            onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
            className="mt-0.5 rounded border-arena-border text-arena-accent focus:ring-arena-accent"
          />
          <label
            htmlFor="confirmCorrection"
            className="text-xs text-arena-muted select-none cursor-pointer"
          >
            I understand this will change official tournament results and reset any dependent downstream matches.
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-arena-muted hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasConfirmedCheckbox || !selectedNewWinnerId}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-arena-bg text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            Save Result Correction
          </button>
        </div>
      </div>
    </div>
  );
};
