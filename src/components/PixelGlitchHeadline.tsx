"use client";

import React, { useState, useEffect, useCallback } from "react";
import { playPixelGlitchSound } from "@/lib/sound-effects";

const SCRAMBLE_CHARS = "█▓▒░#X01?<>%&!@$*";
const TARGET_TEXT_1 = "EVERY MATCH";
const TARGET_TEXT_2 = "MATTERS.";

export function PixelGlitchHeadline() {
  const [displayText1, setDisplayText1] = useState(TARGET_TEXT_1);
  const [displayText2, setDisplayText2] = useState(TARGET_TEXT_2);
  const [isHyperGlitch, setIsHyperGlitch] = useState(false);
  const [glitchBurst, setGlitchBurst] = useState(false);

  const triggerGlitchEffect = useCallback(() => {
    // Sound effect
    try {
      const isMuted = typeof window !== "undefined" && localStorage.getItem("arena_sound_muted") === "true";
      playPixelGlitchSound(isMuted);
    } catch {
      // Audio fallback
    }

    setIsHyperGlitch(true);

    // Scramble effect
    let iteration = 0;
    const maxIterations = 9;

    const interval = setInterval(() => {
      setDisplayText1(
        TARGET_TEXT_1.split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < (iteration / maxIterations) * TARGET_TEXT_1.length) {
              return TARGET_TEXT_1[idx];
            }
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("")
      );

      setDisplayText2(
        TARGET_TEXT_2.split("")
          .map((char, idx) => {
            if (char === " ") return " ";
            if (idx < (iteration / maxIterations) * TARGET_TEXT_2.length) {
              return TARGET_TEXT_2[idx];
            }
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
          })
          .join("")
      );

      iteration++;

      if (iteration > maxIterations) {
        clearInterval(interval);
        setDisplayText1(TARGET_TEXT_1);
        setDisplayText2(TARGET_TEXT_2);
        setIsHyperGlitch(false);
      }
    }, 45);
  }, []);

  // Periodic random ambient micro-glitch burst (every 4-7 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setGlitchBurst(true);
      setTimeout(() => setGlitchBurst(false), 240);
    }, 5500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`group relative inline-block cursor-pointer select-none px-6 py-4 my-2 transition-transform duration-200 active:scale-95 ${
        isHyperGlitch || glitchBurst ? "glitch-active" : ""
      }`}
      onMouseEnter={triggerGlitchEffect}
      onClick={triggerGlitchEffect}
      role="button"
      tabIndex={0}
      aria-label="EVERY MATCH MATTERS. Interactive pixelated glitch title"
    >
      {/* Retro Arcade HUD Corner Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-access-gold/60 transition-all duration-300 group-hover:scale-125 group-hover:border-access-gold" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-access-gold/60 transition-all duration-300 group-hover:scale-125 group-hover:border-access-gold" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-access-gold/60 transition-all duration-300 group-hover:scale-125 group-hover:border-access-gold" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-access-gold/60 transition-all duration-300 group-hover:scale-125 group-hover:border-access-gold" />

      {/* Retro Sub-Header Arcade Tag */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="font-pixel text-[8px] sm:text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-access-blue/40 border border-access-gold/40 text-access-goldLight inline-flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-sm animate-arcade-blink" />
          <span>SYS.READY // 1P_COIN</span>
        </span>
        <span className="font-pixel text-[7px] text-arena-muted/70 tracking-widest hidden sm:inline">
          [HOVER TO GLITCH]
        </span>
      </div>

      {/* Main Glitch Text Container */}
      <div className="relative inline-block">
        {/* Layer 1: Cyan Chromatic Shift (Bottom Layer) */}
        <h1
          aria-hidden="true"
          className="glitch-layer-cyan absolute inset-0 font-pixel text-xl sm:text-3xl md:text-4xl lg:text-5xl tracking-normal text-[#00E5FF] opacity-80 pointer-events-none select-none"
        >
          {displayText1}{" "}
          <span className="text-[#00E5FF]">{displayText2}</span>
        </h1>

        {/* Layer 2: Neon Magenta/Red Shift (Middle Layer) */}
        <h1
          aria-hidden="true"
          className="glitch-layer-magenta absolute inset-0 font-pixel text-xl sm:text-3xl md:text-4xl lg:text-5xl tracking-normal text-[#FF2A6D] opacity-80 pointer-events-none select-none"
        >
          {displayText1}{" "}
          <span className="text-[#FF2A6D]">{displayText2}</span>
        </h1>

        {/* Layer 3: Sharp Base Pixel Font (Top Layer) */}
        <h1 className="relative font-pixel text-xl sm:text-3xl md:text-4xl lg:text-5xl tracking-normal text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] pixel-text-shadow leading-snug">
          <span className="text-white transition-colors duration-150 group-hover:text-cyan-100">
            {displayText1}
          </span>{" "}
          <span className="text-access-gold drop-shadow-[0_0_20px_rgba(255,184,0,0.8)]">
            {displayText2}
          </span>
        </h1>

        {/* CRT Scanline Overlay specifically across the text */}
        <div className="pixel-scanlines absolute inset-0 opacity-40 pointer-events-none rounded" />
      </div>

      {/* Pixelated Underline / Health Bar Decorator */}
      <div className="mt-3 flex items-center justify-center gap-1 opacity-80">
        <div className="h-1.5 w-6 sm:w-10 bg-access-gold rounded-none" />
        <div className="h-1.5 w-2 bg-[#00E5FF] rounded-none animate-pulse" />
        <div className="h-1.5 w-12 sm:w-24 bg-access-blueLight/60 rounded-none" />
        <div className="h-1.5 w-2 bg-access-gold rounded-none" />
        <div className="h-1.5 w-6 sm:w-10 bg-[#FF2A6D] rounded-none" />
      </div>
    </div>
  );
}
