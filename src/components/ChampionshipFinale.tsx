"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Participant, Tournament, Match } from "@/types/tournament";
import { Trophy, Download, X, CheckCircle } from "lucide-react";

interface ChampionshipFinaleProps {
  isOpen: boolean;
  tournament: Tournament;
  champion: Participant;
  matches: Match[];
  participants: Participant[];
  onClose: () => void;
}

export const ChampionshipFinale: React.FC<ChampionshipFinaleProps> = ({
  isOpen,
  tournament,
  champion,
  matches,
  participants,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Elegant gold & purple celebratory confetti burst
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#8B5CF6", "#A78BFA", "#F59E0B", "#34D399", "#F5F5F7"],
        });

        const timer = setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ["#8B5CF6", "#F59E0B"],
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ["#A78BFA", "#F59E0B"],
          });
        }, 400);

        return () => clearTimeout(timer);
      } catch (e) {
        console.error("Confetti trigger failed", e);
      }
    }
  }, [isOpen]);

  const handleExportJSON = () => {
    const data = {
      tournament,
      champion,
      participants,
      matches,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.name.toLowerCase().replace(/\s+/g, "_")}_results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = "Match ID,Round,Position,Participant A,Score A,Participant B,Score B,Winner,Status\n";
    const partMap = new Map(participants.map((p) => [p.id, p.display_name]));

    const rows = matches
      .map((m) => {
        const pA = m.participant_a_id ? partMap.get(m.participant_a_id) || "TBD" : "TBD";
        const pB = m.participant_b_id ? partMap.get(m.participant_b_id) || "BYE" : "BYE";
        const winner = m.winner_id ? partMap.get(m.winner_id) || "" : "";
        return `"${m.id}",${m.round_number},${m.match_position},"${pA}",${m.score_a ?? ""},"${pB}",${m.score_b ?? ""},"${winner}",${m.status}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.name.toLowerCase().replace(/\s+/g, "_")}_bracket.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-gradient-to-b from-arena-elevated to-arena-card border border-amber-500/30 rounded-3xl p-8 md:p-12 text-center shadow-[0_0_50px_-10px_rgba(245,158,11,0.25)] overflow-hidden"
        >
          {/* Subtle Ambient Gold Radiance */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-lg bg-arena-surface/80 border border-arena-border text-arena-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy Emblem */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-arena-bg"
          >
            <Trophy className="w-14 h-14" />
          </motion.div>

          {/* Header */}
          <div className="text-xs md:text-sm font-extrabold uppercase tracking-[0.25em] text-amber-400 mb-2">
            OFFICIAL TOURNAMENT CHAMPION
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-3 break-words">
            {champion.display_name}
          </h1>

          <p className="text-arena-muted text-sm max-w-md mx-auto mb-8">
            Crowned undisputed victor of <span className="text-arena-text font-semibold">{tournament.name}</span> after surviving all elimination rounds.
          </p>

          {/* Tournament Summary Cards */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8">
            <div className="p-3 rounded-xl bg-arena-surface border border-arena-border">
              <div className="text-[10px] uppercase font-bold text-arena-muted">Format</div>
              <div className="text-xs font-semibold text-arena-text capitalize mt-0.5">
                Single Elim
              </div>
            </div>
            <div className="p-3 rounded-xl bg-arena-surface border border-arena-border">
              <div className="text-[10px] uppercase font-bold text-arena-muted">Contenders</div>
              <div className="text-xs font-semibold text-arena-text mt-0.5">
                {participants.length} {tournament.participant_type === "team" ? "Teams" : "Players"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-arena-surface border border-arena-border">
              <div className="text-[10px] uppercase font-bold text-arena-muted">Final Status</div>
              <div className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle className="w-3 h-3" /> Completed
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleExportCSV}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-arena-surface border border-arena-border hover:border-arena-borderLight text-arena-text text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-arena-muted" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-arena-surface border border-arena-border hover:border-arena-borderLight text-arena-text text-xs font-semibold transition"
            >
              <Download className="w-4 h-4 text-arena-muted" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-arena-bg font-bold text-xs tracking-wider uppercase transition shadow-md"
            >
              Review Full Bracket
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
