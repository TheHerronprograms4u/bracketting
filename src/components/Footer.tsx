import React from "react";
import Image from "next/image";
import { Code2 } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-arena-border/70 bg-arena-bg/95 backdrop-blur-md relative z-30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          {/* Brand & Academic Year */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-access-gold/60 shadow-glow-gold flex-shrink-0">
              <Image
                src="/access-logo.jpg"
                alt="ACCeSS Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-black text-sm tracking-wider text-white">
                BU ACCeSS ARENA 2026-2027
              </span>
            </div>
          </div>

          {/* Developer Credit */}
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-arena-surface border border-arena-border/80 text-arena-muted">
              <Code2 className="w-3.5 h-3.5 text-arena-accent" />
              <span>Developed by:</span>
              <strong className="text-white font-bold tracking-wide">
                Harron Noah A. Melgar
              </strong>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
