"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  setCurrentUserRole,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { User, UserRole } from "@/types/tournament";
import { PasswordModal } from "./PasswordModal";
import { MarcoPartyModal } from "./MarcoPartyModal";
import {
  PlusCircle,
  Database,
  UserCheck,
  ChevronDown,
  Lock,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<"organizer" | "admin">("organizer");

  // Easter Egg State: 5-second press-and-hold on the logo
  const [isPartyOpen, setIsPartyOpen] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%

  const holdStartTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastHoldDurationRef = useRef<number>(0);
  const easterEggTriggeredRef = useRef<boolean>(false);

  const HOLD_DURATION_MS = 5000;

  const startHold = useCallback((e?: React.SyntheticEvent) => {
    // Only respond to main mouse button or touch
    if (e && "button" in e && (e as React.MouseEvent).button !== 0) return;

    easterEggTriggeredRef.current = false;
    lastHoldDurationRef.current = 0;
    holdStartTimeRef.current = performance.now();
    setIsHolding(true);
    setHoldProgress(0);

    const updateFrame = () => {
      if (!holdStartTimeRef.current) return;
      const elapsed = performance.now() - holdStartTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      setHoldProgress(pct);

      if (elapsed >= HOLD_DURATION_MS) {
        // 5 seconds completed! Trigger party!
        easterEggTriggeredRef.current = true;
        lastHoldDurationRef.current = elapsed;
        setIsPartyOpen(true);
        setIsHolding(false);
        setHoldProgress(0);
        holdStartTimeRef.current = null;
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);
  }, []);

  const cancelHold = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (holdStartTimeRef.current) {
      lastHoldDurationRef.current = performance.now() - holdStartTimeRef.current;
    }
    holdStartTimeRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    // If the easter egg was triggered or the user held down for > 450ms,
    // prevent normal navigation to "/" so they stay on current page
    if (easterEggTriggeredRef.current || lastHoldDurationRef.current > 450) {
      e.preventDefault();
      easterEggTriggeredRef.current = false;
      lastHoldDurationRef.current = 0;
    }
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateRole = () => setCurrentUser(getCurrentUser());
    updateRole();
    setIsCloudConnected(isSupabaseConfigured());

    window.addEventListener("arena_role_changed", updateRole);
    return () => window.removeEventListener("arena_role_changed", updateRole);
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setIsRoleDropdownOpen(false);
    if (role === "participant") {
      const updated = setCurrentUserRole("participant");
      setCurrentUser(updated);
      window.dispatchEvent(new Event("arena_role_changed"));
      return;
    }

    if (currentUser?.role === role) return;

    setTargetRole(role);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSuccess = (role: "organizer" | "admin", password?: string) => {
    try {
      const updated = setCurrentUserRole(role, password);
      setCurrentUser(updated);
      setIsPasswordModalOpen(false);
      window.dispatchEvent(new Event("arena_role_changed"));
    } catch (err) {
      console.error("Auth error:", err);
    }
  };

  const isStaff = currentUser?.role === "organizer" || currentUser?.role === "admin";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-arena-border/80 bg-arena-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo and Tagline */}
          <div className="flex items-center gap-8">
            {/* Logo and Tagline (Easter Egg: Hold for 5s) */}
            <div className="relative">
              <Link
                href="/"
                onClick={handleLogoClick}
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                onContextMenu={(e) => {
                  if (isHolding || isPartyOpen) e.preventDefault();
                }}
                className="flex items-center gap-2 group select-none relative cursor-pointer"
              >
                {/* Hold progress ring & Logo */}
                <div className="relative flex items-center justify-center">
                  {/* Circular Hold Progress Ring */}
                  {isHolding && (
                    <svg
                      className="absolute -inset-1.5 w-[52px] h-[52px] -rotate-90 pointer-events-none z-20"
                      viewBox="0 0 52 52"
                    >
                      <circle
                        cx="26"
                        cy="26"
                        r="23"
                        stroke="rgba(255, 184, 0, 0.25)"
                        strokeWidth="3.5"
                        fill="none"
                      />
                      <circle
                        cx="26"
                        cy="26"
                        r="23"
                        stroke="url(#hold-gradient)"
                        strokeWidth="3.5"
                        fill="none"
                        strokeDasharray={144.5}
                        strokeDashoffset={144.5 - (holdProgress / 100) * 144.5}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="hold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFB800" />
                          <stop offset="50%" stopColor="#FF4081" />
                          <stop offset="100%" stopColor="#00E5FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}

                  <div
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${
                      isHolding
                        ? "border-amber-400 shadow-[0_0_25px_rgba(255,184,0,0.85)] scale-105 animate-pulse"
                        : "border-access-gold shadow-glow-gold group-hover:scale-105"
                    }`}
                  >
                    <Image
                      src="/access-logo.jpg"
                      alt="ACCeSS Logo"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      priority
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="font-black text-lg tracking-wider text-white flex items-center gap-1.5">
                    ACCeSS ARENA
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-arena-muted">
                    Every Match Matters
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition ${
                  pathname === "/"
                    ? "bg-arena-elevated text-white border border-arena-border"
                    : "text-arena-muted hover:text-white hover:bg-arena-surface"
                }`}
              >
                Tournaments
              </Link>

              {isStaff ? (
                <Link
                  href="/create"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition ${
                    pathname === "/create"
                      ? "bg-arena-elevated text-white border border-arena-border"
                      : "text-arena-muted hover:text-white hover:bg-arena-surface"
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-arena-accent" />
                  <span>Create Tournament</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setTargetRole("organizer");
                    setIsPasswordModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide text-arena-muted hover:text-white hover:bg-arena-surface transition"
                  title="Organizer profile required to create tournaments"
                >
                  <Lock className="w-3.5 h-3.5 text-arena-muted" />
                  <span>Create Tournament</span>
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-arena-accent/15 text-arena-highlight font-bold uppercase">
                    Staff
                  </span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Section: DB Status, Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Storage / Supabase Status Badge */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-arena-surface border border-arena-border text-arena-muted"
              title={
                isCloudConnected
                  ? "Connected to PostgreSQL Supabase instance"
                  : "Running in Local Storage Mode (State is persistently saved locally)"
              }
            >
              <Database
                className={`w-3 h-3 ${
                  isCloudConnected ? "text-emerald-400" : "text-arena-accent"
                }`}
              />
              <span>
                {isCloudConnected ? "Cloud Active" : "Local Storage Active"}
              </span>
            </div>

            {/* Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arena-elevated border border-arena-border hover:border-arena-borderLight text-xs text-arena-text transition shadow-sm"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    currentUser?.role === "organizer"
                      ? "bg-arena-accent"
                      : currentUser?.role === "admin"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                />
                <span className="font-semibold capitalize">
                  {currentUser?.role || "Participant"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-arena-muted" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-arena-elevated border border-arena-border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-arena-muted border-b border-arena-border/50">
                    Switch Active Role
                  </div>

                  <button
                    onClick={() => handleRoleSelect("participant")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                      currentUser?.role === "participant"
                        ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                        : "text-arena-text hover:bg-arena-surface"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>Participant Mode</span>
                      <span className="text-[10px] text-arena-muted">
                        Default visitor & registration mode
                      </span>
                    </div>
                    {currentUser?.role === "participant" && (
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <button
                    onClick={() => handleRoleSelect("organizer")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                      currentUser?.role === "organizer"
                        ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                        : "text-arena-text hover:bg-arena-surface"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <span>Organizer Mode</span>
                        {currentUser?.role !== "organizer" && (
                          <Lock className="w-3 h-3 text-arena-muted" />
                        )}
                      </span>
                      <span className="text-[10px] text-arena-muted">
                        Full bracket & match controls
                      </span>
                    </div>
                    {currentUser?.role === "organizer" && (
                      <UserCheck className="w-4 h-4 text-arena-accent" />
                    )}
                  </button>

                  <button
                    onClick={() => handleRoleSelect("admin")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                      currentUser?.role === "admin"
                        ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                        : "text-arena-text hover:bg-arena-surface"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1.5">
                        <span>Admin Mode</span>
                        {currentUser?.role !== "admin" && (
                          <Lock className="w-3 h-3 text-arena-muted" />
                        )}
                      </span>
                      <span className="text-[10px] text-arena-muted">
                        Full platform administrator
                      </span>
                    </div>
                    {currentUser?.role === "admin" && (
                      <UserCheck className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Password Authentication Modal */}
      <PasswordModal
        isOpen={isPasswordModalOpen}
        targetRole={targetRole}
        onSuccess={handlePasswordSuccess}
        onCancel={() => setIsPasswordModalOpen(false)}
      />

      {/* Secret Marco Easter Egg Party Modal */}
      <MarcoPartyModal
        isOpen={isPartyOpen}
        onClose={() => setIsPartyOpen(false)}
        durationSeconds={8}
      />
    </>
  );
};
