"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Participant } from "@/types/tournament";
import { playImpactSound, playShatterSound, playVictoryFanfare } from "@/lib/sound-effects";
import { FastForward, Volume2, VolumeX, Shield, Trophy } from "lucide-react";

interface EliminationCinematicProps {
  isOpen: boolean;
  winner: Participant;
  loser: Participant | null;
  roundName: string;
  isChampionship?: boolean;
  scoreA?: number | null;
  scoreB?: number | null;
  isSoundMuted?: boolean;
  onClose: () => void;
}

interface Shard {
  id: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  clipPath: string;
}

export const EliminationCinematic: React.FC<EliminationCinematicProps> = ({
  isOpen,
  winner,
  loser,
  roundName,
  isChampionship = false,
  scoreA,
  scoreB,
  isSoundMuted = false,
  onClose,
}) => {
  // Animation Stages:
  // 1: Standoff (VS matchup reveal)
  // 2: The Strike & Digital Shatter
  // 3: Victory Dominance Announcement
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [soundMuted, setSoundMuted] = useState(isSoundMuted);
  const [screenShake, setScreenShake] = useState(false);

  // Generate deterministic polygonal shards for the defeated opponent
  const shards: Shard[] = useMemo(() => {
    const list: Shard[] = [];
    const colors = [
      "#F87171", // danger red
      "#EF4444",
      "#B91C1C",
      "#779fba", // muted sky glitch
      "#B3CEE5", // serenity glitch
      "#4B5563",
      "#9CA3AF",
      "#F0F5F9",
    ];

    const clipPaths = [
      "polygon(0% 0%, 100% 0%, 50% 100%)",
      "polygon(50% 0%, 100% 100%, 0% 100%)",
      "polygon(0% 50%, 50% 0%, 100% 50%, 50% 100%)",
      "polygon(20% 0%, 100% 20%, 80% 100%, 0% 80%)",
      "polygon(0% 0%, 80% 0%, 100% 100%, 20% 100%)",
    ];

    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const distance = 160 + Math.random() * 320;
      list.push({
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotate: Math.floor(Math.random() * 720 - 360),
        scale: 0.4 + Math.random() * 0.9,
        color: colors[Math.floor(Math.random() * colors.length)],
        clipPath: clipPaths[Math.floor(Math.random() * clipPaths.length)],
      });
    }
    return list;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setStage(1);
      return;
    }

    // Stage progression timers
    // Stage 1: Face-off (1.1s)
    const t1 = setTimeout(() => {
      setStage(2);
      setScreenShake(true);
      playImpactSound(soundMuted);
      playShatterSound(soundMuted);

      const shakeTimer = setTimeout(() => setScreenShake(false), 350);
      return () => clearTimeout(shakeTimer);
    }, 1200);

    // Stage 2: Digital Shatter -> Stage 3: Victory reveal (after 0.9s)
    const t2 = setTimeout(() => {
      setStage(3);
      playVictoryFanfare(soundMuted);
    }, 2100);

    // Auto close after victory presentation (total ~5 seconds)
    const t3 = setTimeout(() => {
      onClose();
    }, 5500);

    // Handle Escape key to skip immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, soundMuted, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-arena-bg/95 backdrop-blur-xl overflow-hidden select-none"
      >
        {/* Ambient Pulsing Background Glow */}
        <div className="absolute inset-0 bg-radial-glow pointer-events-none opacity-80" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-arena-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls: Audio toggle & Skip button */}
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arena-elevated/80 border border-arena-border hover:border-arena-borderLight text-arena-muted hover:text-arena-text text-xs transition"
            title={soundMuted ? "Unmute audio effects" : "Mute audio effects"}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-arena-accent" />}
            <span>{soundMuted ? "Sound Off" : "Sound On"}</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-arena-elevated border border-arena-border hover:border-arena-accent hover:text-white text-arena-text text-xs font-medium transition group"
          >
            <span>Skip Cinematic</span>
            <FastForward className="w-3.5 h-3.5 text-arena-muted group-hover:text-arena-accent transition" />
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-arena-surface border border-arena-border rounded text-arena-muted">
              ESC
            </kbd>
          </button>
        </div>

        {/* Tournament Round Pill */}
        <div className="absolute top-8 left-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-arena-highlight bg-arena-accent/10 border border-arena-accent/30 px-3 py-1 rounded-full">
          <Shield className="w-3.5 h-3.5" />
          <span>{roundName}</span>
        </div>

        {/* Main Animation Stage */}
        <div
          className={`relative w-full max-w-5xl px-6 flex flex-col items-center justify-center transition-transform duration-100 ${
            screenShake ? "animate-shiver" : ""
          }`}
        >
          {/* STAGE 1 & 2: THE CONFRONTATION AND IMPACT */}
          {stage < 3 && (
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 relative">
              {/* WINNER CARD */}
              <motion.div
                layout
                initial={{ x: -120, opacity: 0, scale: 0.9 }}
                animate={
                  stage === 1
                    ? { x: 0, opacity: 1, scale: 1 }
                    : {
                        // The Crushing Strike: Winner surges violently forward
                        x: 180,
                        scale: 1.25,
                        zIndex: 30,
                        transition: { type: "spring", stiffness: 400, damping: 20 },
                      }
                }
                className="relative flex flex-col items-center p-8 rounded-2xl bg-gradient-to-br from-arena-elevated to-arena-card border-2 border-arena-accent shadow-glow max-w-sm w-full text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-arena-accent/20 border border-arena-accent flex items-center justify-center mb-4 text-arena-highlight shadow-glow-sm">
                  {isChampionship ? <Trophy className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-arena-highlight mb-1">
                  ADVANCING COMPETITOR
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight break-words max-w-full">
                  {winner.display_name}
                </h3>
                {scoreA !== null && scoreB !== null && (
                  <div className="mt-3 px-3 py-1 rounded-md bg-arena-surface border border-arena-border text-sm font-bold text-arena-accent">
                    SCORE: {scoreA}
                  </div>
                )}
              </motion.div>

              {/* VS BADGE */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  stage === 1
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.5, transition: { duration: 0.2 } }
                }
                className="text-arena-muted font-black text-2xl tracking-widest bg-arena-surface border border-arena-border w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              >
                VS
              </motion.div>

              {/* LOSER CARD & DIGITAL SHATTER PARTICLES */}
              <div className="relative max-w-sm w-full">
                {stage === 1 && loser && (
                  <motion.div
                    initial={{ x: 120, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center p-8 rounded-2xl bg-arena-elevated/70 border border-arena-border text-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-center mb-4 text-arena-muted">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-arena-muted mb-1">
                      DEFENDING
                    </div>
                    <h3 className="text-2xl md:text-3xl font-extrabold text-arena-muted tracking-tight break-words max-w-full">
                      {loser.display_name}
                    </h3>
                    {scoreA !== null && scoreB !== null && (
                      <div className="mt-3 px-3 py-1 rounded-md bg-arena-surface border border-arena-border text-sm font-semibold text-arena-muted">
                        SCORE: {scoreB}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* THE SHATTER EFFECT: Geometric polygonal fragments explode */}
                {stage === 2 && loser && (
                  <div className="relative w-full h-48 flex items-center justify-center">
                    {/* Impact Flash */}
                    <motion.div
                      initial={{ scale: 0.2, opacity: 1 }}
                      animate={{ scale: 3, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute w-32 h-32 rounded-full bg-white blur-xl pointer-events-none"
                    />

                    {/* Exploding Shards */}
                    {shards.map((s) => (
                      <motion.div
                        key={s.id}
                        initial={{ x: 0, y: 0, scale: s.scale, opacity: 1, rotate: 0 }}
                        animate={{
                          x: s.x,
                          y: s.y,
                          rotate: s.rotate,
                          scale: 0,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.75 + Math.random() * 0.3,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        style={{
                          backgroundColor: s.color,
                          clipPath: s.clipPath,
                        }}
                        className="absolute w-8 h-8 pointer-events-none shadow-glow-danger"
                      />
                    ))}

                    {/* Dissolving defeated label */}
                    <motion.span
                      initial={{ opacity: 0.8, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.4, filter: "blur(8px)" }}
                      transition={{ duration: 0.4 }}
                      className="text-arena-danger font-extrabold text-xl tracking-wider uppercase"
                    >
                      ELIMINATED
                    </motion.span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: THE VICTORY ANNOUNCEMENT */}
          {stage === 3 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className="flex flex-col items-center text-center p-8 md:p-12 rounded-3xl bg-gradient-to-b from-arena-elevated via-arena-card to-arena-bg border-2 border-arena-accent/50 shadow-glow max-w-2xl w-full relative"
            >
              {/* Victory Crown / Badge */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-arena-accent to-arena-highlight flex items-center justify-center text-arena-bg mb-6 shadow-glow">
                {isChampionship ? <Trophy className="w-9 h-9" /> : <Shield className="w-9 h-9" />}
              </div>

              <span className="text-sm md:text-base font-extrabold tracking-[0.3em] uppercase text-arena-highlight mb-2">
                MATCH VICTORY
              </span>

              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-4 break-words max-w-full">
                {winner.display_name}
              </h1>

              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-arena-accent/15 border border-arena-accent/40 text-arena-text text-sm font-medium">
                <span>
                  {isChampionship
                    ? "TOURNAMENT CHAMPION"
                    : `ADVANCES FROM ${roundName.toUpperCase()}`}
                </span>
              </div>

              {loser && (
                <div className="mt-6 text-xs text-arena-muted flex items-center gap-1.5">
                  <span className="line-through opacity-70">{loser.display_name}</span>
                  <span className="text-arena-danger">eliminated from competition</span>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-8 px-8 py-3 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white font-bold text-sm tracking-wide shadow-glow transition active:scale-95"
              >
                Return to Bracket
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
