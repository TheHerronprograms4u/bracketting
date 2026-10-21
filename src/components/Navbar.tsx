"use client";

import React, { useState, useEffect } from "react";
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
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-access-gold shadow-glow-gold group-hover:scale-105 transition-transform flex-shrink-0">
                <Image
                  src="/access-logo.jpg"
                  alt="ACCeSS Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-wider text-white flex items-center gap-1.5">
                  ACCe<span className="text-access-gold">SS</span> ARENA
                  <span className="w-1.5 h-1.5 rounded-full bg-access-gold animate-pulse" />
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
    </>
  );
};
