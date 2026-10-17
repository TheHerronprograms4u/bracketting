"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTournament, getCurrentUser, setCurrentUserRole } from "@/lib/storage";
import { Navbar } from "@/components/Navbar";
import { PasswordModal } from "@/components/PasswordModal";
import { UserRole } from "@/types/tournament";
import {
  Trophy,
  ArrowLeft,
  AlertCircle,
  Lock,
  ShieldCheck,
} from "lucide-react";

export default function CreateTournamentPage() {
  const router = useRouter();

  const [currentUserRole, setCurrentUserRoleState] = useState<UserRole>("participant");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"single_elimination" | "double_elimination">("single_elimination");
  const [participantType, setParticipantType] = useState<"individual" | "team">("team");
  const [capacityLimit, setCapacityLimit] = useState<string>("");
  const [seedingMethod, setSeedingMethod] = useState<"seeded" | "random" | "manual">("seeded");
  const [hasScoring, setHasScoring] = useState(true);
  const [registrationStatus, setRegistrationStatus] = useState<"open" | "closed">("open");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const updateRole = () => {
      const user = getCurrentUser();
      setCurrentUserRoleState(user.role);
    };
    updateRole();

    window.addEventListener("arena_role_changed", updateRole);
    return () => window.removeEventListener("arena_role_changed", updateRole);
  }, []);

  const handlePasswordSuccess = (role: "organizer" | "admin", password?: string) => {
    try {
      setCurrentUserRole(role, password);
      setCurrentUserRoleState(role);
      setIsPasswordModalOpen(false);
      window.dispatchEvent(new Event("arena_role_changed"));
    } catch (err) {
      console.error(err);
    }
  };

  const isStaff = currentUserRole === "organizer" || currentUserRole === "admin";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const user = getCurrentUser();
    if (user.role === "participant") {
      setError("Participant profiles are not authorized to create tournaments.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Tournament name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedCapacity = capacityLimit.trim()
        ? parseInt(capacityLimit, 10)
        : null;

      if (parsedCapacity !== null && (isNaN(parsedCapacity) || parsedCapacity < 2)) {
        setError("Capacity limit must be at least 2 competitors if specified.");
        setIsSubmitting(false);
        return;
      }

      const newTourney = createTournament({
        name: trimmedName,
        description: description.trim(),
        format,
        participant_type: participantType,
        capacity_limit: parsedCapacity,
        registration_status: registrationStatus,
        seeding_method: seedingMethod,
        has_scoring: hasScoring,
      });

      router.push(`/tournament/${newTourney.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tournament.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text pb-20">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-arena-muted hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Tournaments</span>
        </Link>

        {!isStaff ? (
          <div className="rounded-3xl bg-arena-card border border-arena-border p-8 md:p-12 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">
              Organizer Authorization Required
            </h1>
            <p className="text-xs text-arena-muted max-w-md mx-auto mb-6 leading-relaxed">
              Participant profiles are not authorized to create tournaments. Please authenticate with the staff access password (<strong className="text-arena-highlight">Access2026</strong>) to unlock Organizer or Admin mode.
            </p>

            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl bg-arena-surface border border-arena-border text-arena-muted hover:text-white text-xs font-semibold transition"
              >
                Back to Tournaments
              </Link>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Unlock Organizer Profile</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-arena-card border border-arena-border p-6 md:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-arena-accent/20 border border-arena-accent flex items-center justify-center text-arena-highlight shadow-glow-sm">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Create New Tournament
                </h1>
                <p className="text-xs text-arena-muted">
                  Configure your dynamic single-elimination tournament parameters.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-arena-danger/10 border border-arena-danger/30 text-arena-danger text-xs mb-6 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tournament Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                Tournament Name *
              </label>
              <input
                type="text"
                placeholder="e.g. VALKYRIE INVITATIONAL 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-sm outline-none transition"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                Description & Rules
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe the competition rules, game title, or schedule..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-sm outline-none transition"
              />
            </div>

            {/* Tournament Format */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                Tournament Elimination Format
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat("single_elimination")}
                  className={`flex flex-col p-3.5 rounded-xl border text-left transition ${
                    format === "single_elimination"
                      ? "bg-arena-accent/20 border-arena-accent text-white"
                      : "bg-arena-surface border-arena-border text-arena-muted hover:border-arena-borderLight hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold">Single Elimination</span>
                  <span className="text-[11px] text-arena-muted mt-1 leading-relaxed">
                    Standard knockout. One loss eliminates a competitor. Fastest route to 1 champion.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat("double_elimination")}
                  className={`flex flex-col p-3.5 rounded-xl border text-left transition ${
                    format === "double_elimination"
                      ? "bg-arena-accent/20 border-arena-accent text-white"
                      : "bg-arena-surface border-arena-border text-arena-muted hover:border-arena-borderLight hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center justify-between">
                    <span>Double Elimination</span>
                    <span className="text-[10px] text-arena-highlight uppercase font-extrabold px-1.5 py-0.5 rounded bg-arena-accent/30 border border-arena-accent/40">
                      Losers Bracket
                    </span>
                  </span>
                  <span className="text-[11px] text-arena-muted mt-1 leading-relaxed">
                    Winners & Losers brackets. Competitors get a second chance before elimination.
                  </span>
                </button>
              </div>
            </div>

            {/* Competitor Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                  Competitor Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setParticipantType("team")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      participantType === "team"
                        ? "bg-arena-accent/20 border-arena-accent text-white font-bold"
                        : "bg-arena-surface border-arena-border text-arena-muted hover:text-white"
                    }`}
                  >
                    Teams
                  </button>
                  <button
                    type="button"
                    onClick={() => setParticipantType("individual")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      participantType === "individual"
                        ? "bg-arena-accent/20 border-arena-accent text-white font-bold"
                        : "bg-arena-surface border-arena-border text-arena-muted hover:text-white"
                    }`}
                  >
                    Individual 1v1
                  </button>
                </div>
              </div>

              {/* Seeding Method */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                  Seeding Strategy
                </label>
                <select
                  value={seedingMethod}
                  onChange={(e) =>
                    setSeedingMethod(e.target.value as "seeded" | "random" | "manual")
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-xs outline-none"
                >
                  <option value="seeded">Seeded (Standard International Draw)</option>
                  <option value="random">Random Draw (Automatic Shuffle)</option>
                  <option value="manual">Manual / Registration Order</option>
                </select>
              </div>
            </div>

            {/* Capacity Limit & Registration Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-arena-muted">
                    Capacity Limit (Optional)
                  </label>
                  <span className="text-[10px] text-arena-muted">Leave blank for unlimited</span>
                </div>
                <input
                  type="number"
                  min="2"
                  placeholder="Unlimited"
                  value={capacityLimit}
                  onChange={(e) => setCapacityLimit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-arena-muted mb-2">
                  Registration Initial State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegistrationStatus("open")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      registrationStatus === "open"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                        : "bg-arena-surface border-arena-border text-arena-muted"
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegistrationStatus("closed")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition ${
                      registrationStatus === "closed"
                        ? "bg-arena-surface border-arena-border text-white font-bold"
                        : "bg-arena-surface/50 border-arena-border/50 text-arena-muted"
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>
            </div>

            {/* Scoring Toggle */}
            <div className="p-4 rounded-xl bg-arena-surface border border-arena-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Enable Match Scores
                </span>
                <span className="text-[11px] text-arena-muted">
                  Allow organizers to record numeric scores (e.g. 2 - 1) alongside declared winners.
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasScoring}
                onChange={(e) => setHasScoring(e.target.checked)}
                className="w-4 h-4 rounded text-arena-accent border-arena-border focus:ring-arena-accent cursor-pointer"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-arena-border/50">
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-arena-muted hover:text-white transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold tracking-wide shadow-glow transition active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Creating Tournament..." : "Create & Open Dashboard"}
              </button>
            </div>
          </form>
        </div>
        )}
      </main>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        targetRole="organizer"
        onSuccess={handlePasswordSuccess}
        onCancel={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
