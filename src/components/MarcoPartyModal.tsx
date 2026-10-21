"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface MarcoPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  durationSeconds?: number;
}

export const MarcoPartyModal: React.FC<MarcoPartyModalProps> = ({
  isOpen,
  onClose,
  durationSeconds = 5,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Confetti cannons from sides and top
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

    // Initial burst
    fireSideCannons();
    fireCenterShower();

    // Secondary burst
    const burstInterval = setInterval(fireSideCannons, 1600);

    // Automatic closing after duration
    const closeTimer = setTimeout(() => {
      onClose();
    }, durationSeconds * 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(burstInterval);
      clearTimeout(closeTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, durationSeconds, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden bg-black/75 backdrop-blur-md cursor-pointer select-none"
        >
          {/* Animated Marco Photo Window */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.75, opacity: 0, rotate: 4 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default"
          >
            {/* Ambient Rainbow Glow Ring behind the photo */}
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.08, 1],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute -inset-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 opacity-80 blur-lg pointer-events-none"
            />

            {/* Photo Animation Container */}
            <motion.div
              animate={{
                rotate: [-3, 3, -2, 3, -3],
                scale: [1, 1.04, 0.98, 1.03, 1],
                y: [0, -6, 0, -4, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut",
              }}
              className="relative w-80 sm:w-96 md:w-[480px] h-60 sm:h-72 md:h-80 rounded-2xl overflow-hidden border-4 border-amber-300 shadow-2xl bg-black"
            >
              <Image
                src="/marco.jpg"
                alt="Marco"
                fill
                priority
                sizes="(max-width: 640px) 320px, (max-width: 768px) 384px, 480px"
                className="object-cover pointer-events-none"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
