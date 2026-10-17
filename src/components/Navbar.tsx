"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getCurrentUser,
  setCurrentUserRole,
} from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase";
import { User, UserRole } from "@/types/tournament";
import {
  Trophy,
  PlusCircle,
  Database,
  UserCheck,
  ChevronDown,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    setIsCloudConnected(isSupabaseConfigured());
  }, []);

  const handleRoleChange = (role: UserRole) => {
    const updated = setCurrentUserRole(role);
    setCurrentUser(updated);
    setIsRoleDropdownOpen(false);
    // Refresh window event so other components immediately know about role changes
    window.dispatchEvent(new Event("arena_role_changed"));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-arena-border/80 bg-arena-bg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Tagline */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-arena-accent/20 border border-arena-accent flex items-center justify-center text-arena-highlight shadow-glow-sm group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-wider text-white flex items-center gap-1.5">
                ARENA
                <span className="w-1.5 h-1.5 rounded-full bg-arena-accent animate-pulse" />
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-arena-muted">
                Every Match Matters
              </span>
            </div>
          </Link>

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
                {currentUser?.role || "Organizer"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-arena-muted" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-arena-elevated border border-arena-border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-arena-muted border-b border-arena-border/50">
                  Switch Testing Role
                </div>
                <button
                  onClick={() => handleRoleChange("organizer")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                    currentUser?.role === "organizer"
                      ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                      : "text-arena-text hover:bg-arena-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>Organizer Mode</span>
                    <span className="text-[10px] text-arena-muted">
                      Full bracket & match controls
                    </span>
                  </div>
                  {currentUser?.role === "organizer" && (
                    <UserCheck className="w-4 h-4 text-arena-accent" />
                  )}
                </button>

                <button
                  onClick={() => handleRoleChange("participant")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                    currentUser?.role === "participant"
                      ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                      : "text-arena-text hover:bg-arena-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>Participant Mode</span>
                    <span className="text-[10px] text-arena-muted">
                      Registration & bracket viewer
                    </span>
                  </div>
                  {currentUser?.role === "participant" && (
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  )}
                </button>

                <button
                  onClick={() => handleRoleChange("admin")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition ${
                    currentUser?.role === "admin"
                      ? "bg-arena-accent/20 text-arena-highlight font-semibold"
                      : "text-arena-text hover:bg-arena-surface"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>Admin Mode</span>
                    <span className="text-[10px] text-arena-muted">
                      System administrator
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
  );
};
