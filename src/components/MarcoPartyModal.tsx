"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { X, Sparkles, Volume2, VolumeX, RotateCcw, PartyPopper } from "lucide-react";
import { playPartyFanfare } from "@/lib/sound-effects";

interface MarcoPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  durationSeconds?: number;
}

export const MarcoPartyModal: React.FC<MarcoPartyModalProps> = ({
  isOpen,
  onClose,
  durationSeconds = 8,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const audioStopRef = useRef<(() => void) | null>(null);

  // Sound and confetti orchestrator
  useEffect(() => {
    if (!isOpen) {
      if (audioStopRef.current) {
        audioStopRef.current();
        audioStopRef.current = null;
      }
      return;
    }

    setTimeLeft(durationSeconds);

    // Play lively procedural party fanfare
    if (!isMuted) {
      audioStopRef.current = playPartyFanfare(false);
    }

    // Party confetti bursts
    const fireSideCannons = () => {
      try {
        confetti({
          particleCount: 75,
          angle: 60,
          spread: 70,
          origin: { x: 0, y: 0.65 },
          colors: ["#FFB800", "#FF4081", "#00E5FF", "#76FF03", "#D500F9", "#FFD700"],
        });
        confetti({
          particleCount: 75,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.65 },
          colors: ["#FFB800", "#FF4081", "#00E5FF", "#76FF03", "#D500F9", "#FFD700"],
        });
      } catch (err) {
        console.error("Confetti error", err);
      }
    };

    const fireCenterShower = () => {
      try {
        confetti({
          particleCount: 90,
          spread: 100,
          origin: { x: 0.5, y: 0.25 },
          colors: ["#FFB800", "#3A5BC7", "#FF5252", "#E040FB", "#00E676"],
        });
      } catch (err) {
        console.error("Confetti error", err);
      }
    };

    // First burst instantly
    fireSideCannons();
    fireCenterShower();

    // Additional confetti bursts every 1.8s
    const burstInterval = setInterval(() => {
      fireSideCannons();
    }, 1800);

    // Countdown timer for automatic revert
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          clearInterval(burstInterval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // ESC key listener to revert
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(burstInterval);
      clearInterval(timerInterval);
      window.removeEventListener("keydown", handleKeyDown);
      if (audioStopRef.current) {
        audioStopRef.current();
        audioStopRef.current = null;
      }
    };
  }, [isOpen, durationSeconds, onClose, isMuted]);

  const progressPercent = Math.max(0, Math.min(100, ((durationSeconds - timeLeft) / durationSeconds) * 100));

  // Floating party emoji items
  const partyEmojis = [
    { emoji: "🎉", left: "10%", delay: 0 },
    { emoji: "🕺", left: "22%", delay: 1.2 },
    { emoji: "✨", left: "35%", delay: 0.5 },
    { emoji: "🪩", left: "48%", delay: 1.8 },
    { emoji: "🥳", left: "62%", delay: 0.8 },
    { emoji: "🎊", left: "75%", delay: 1.5 },
    { emoji: "🎈", left: "88%", delay: 0.3 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(16, 25, 60, 0.92) 0%, rgba(5, 8, 20, 0.97) 100%)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          {/* Animated Disco Spotlights in Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.35, 0.65, 0.35],
                rotate: [0, 180, 360],
              }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-pink-500/30 via-purple-500/25 to-cyan-400/30 blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1.3, 1, 1.3],
                opacity: [0.3, 0.6, 0.3],
                rotate: [360, 180, 0],
              }}
              transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
              className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-amber-400/30 via-rose-500/25 to-indigo-500/30 blur-3xl"
            />

            {/* Rising floating emojis */}
            {partyEmojis.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ y: "110vh", opacity: 0, rotate: 0 }}
                animate={{
                  y: "-15vh",
                  opacity: [0, 1, 1, 0],
                  rotate: idx % 2 === 0 ? 360 : -360,
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  delay: item.delay,
                  ease: "easeInOut",
                }}
                className="absolute text-3xl select-none"
                style={{ left: item.left }}
              >
                {item.emoji}
              </motion.div>
            ))}
          </div>

          {/* ── Party Window ────────────────────────────────────────── */}
          <motion.div
            initial={{ scale: 0.7, y: 40, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, y: 30, opacity: 0, rotate: 3 }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 24,
            }}
            className="relative w-full max-w-lg sm:max-w-xl rounded-2xl border-2 border-amber-400/80 bg-[#0C1628]/95 shadow-[0_0_60px_rgba(255,184,0,0.45)] overflow-hidden flex flex-col z-10"
          >
            {/* Window Top Titlebar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-blue-500/20 border-b border-amber-400/30">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                <span className="ml-2 font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <PartyPopper className="w-4 h-4 text-amber-400 animate-bounce" />
                  Marco Party Zone • HEHE!
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition text-xs"
                  title={isMuted ? "Unmute Party Sounds" : "Mute Party Sounds"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500 text-white/80 hover:text-white transition"
                  title="Revert back to original (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-5 sm:p-7 flex flex-col items-center text-center">
              {/* Fun Header */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-400/25 to-pink-500/25 border border-amber-400/60 text-amber-300 text-xs font-black uppercase tracking-widest shadow-glow-gold mb-3"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                EASTER EGG UNLOCKED! HEHE
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1 drop-shadow-md">
                🎉 MEET MARCO! 🎉
              </h2>
              <p className="text-xs sm:text-sm text-arena-muted font-medium max-w-sm mb-4">
                You held the ACCeSS logo for 5 seconds and unleashed the party spirit!
              </p>

              {/* The Star of the Show: Marco.jpg with party dance animation */}
              <div className="relative my-2 group">
                {/* Glow ring behind photo */}
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.06, 1],
                  }}
                  transition={{
                    rotate: { duration: 12, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="absolute -inset-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 opacity-75 blur-md"
                />

                {/* Animated Marco Photo Container */}
                <motion.div
                  animate={{
                    rotate: [-2, 2, -1.5, 2.5, -2],
                    scale: [1, 1.03, 0.99, 1.02, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.2,
                    ease: "easeInOut",
                  }}
                  className="relative w-72 sm:w-84 h-52 sm:h-60 rounded-xl overflow-hidden border-2 border-amber-300 shadow-2xl bg-black/40 flex items-center justify-center"
                >
                  <Image
                    src="/marco.jpg"
                    alt="Marco"
                    fill
                    priority
                    sizes="(max-width: 640px) 288px, 336px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Corner celebration stamp */}
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                    <span>👑 VIP LEGEND</span>
                  </div>

                  <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-md bg-black/75 border border-white/20 text-white text-[10px] font-bold backdrop-blur-sm">
                    <span>🕺 100% PARTY READY</span>
                  </div>
                </motion.div>
              </div>

              {/* Auto-revert countdown progress bar */}
              <div className="w-full mt-5 bg-arena-surface/80 border border-arena-border rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-arena-muted flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    Auto-reverting to original:
                  </span>
                  <span className="text-amber-300 font-mono font-bold">
                    {timeLeft}s remaining
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 max-w-xs inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Revert Back to Original Now</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
