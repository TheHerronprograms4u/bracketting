"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getTournaments,
  addParticipant,
  deleteTournament,
  initStorage,
  getCurrentUser,
  setCurrentUserRole,
} from "@/lib/storage";
import { Tournament, UserRole } from "@/types/tournament";
import { Navbar } from "@/components/Navbar";
import { PasswordModal } from "@/components/PasswordModal";
import {
  Trophy,
  Users,
  Layers,
  Search,
  PlusCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
  X,
  AlertCircle,
  Trash2,
  Lock,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentUserRole, setCurrentUserRoleState] = useState<UserRole>("participant");

  // Deletion modal state for completed tournaments
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Staff unlock modal state (for participant clicking create)
  const [isStaffPasswordModalOpen, setIsStaffPasswordModalOpen] = useState(false);

  // Registration Modal State for quick user entry
  const [registeringTournament, setRegisteringTournament] = useState<Tournament | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState("");

  const refreshTournaments = () => {
    initStorage();
    const list = getTournaments();
    setTournaments(list);
    const user = getCurrentUser();
    setCurrentUserRoleState(user.role);
  };

  useEffect(() => {
    refreshTournaments();

    const handleRoleChanged = () => {
      const user = getCurrentUser();
      setCurrentUserRoleState(user.role);
    };

    const handleStorageSynced = () => {
      refreshTournaments();
    };

    window.addEventListener("arena_role_changed", handleRoleChanged);
    window.addEventListener("arena_storage_synced", handleStorageSynced);
    return () => {
      window.removeEventListener("arena_role_changed", handleRoleChanged);
      window.removeEventListener("arena_storage_synced", handleStorageSynced);
    };
  }, []);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tournaments, searchQuery, statusFilter]);

  const isStaff = currentUserRole === "organizer" || currentUserRole === "admin";

  const handleDeleteConfirm = () => {
    if (!tournamentToDelete) return;
    setDeleteError("");
    try {
      deleteTournament(tournamentToDelete.id);
      const deletedName = tournamentToDelete.name;
      setTournamentToDelete(null);
      refreshTournaments();
      setFeedbackToast(`Tournament "${deletedName}" was deleted.`);
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete tournament.");
    }
  };

  const handleStaffPasswordSuccess = (role: "organizer" | "admin", password?: string) => {
    try {
      setCurrentUserRole(role, password);
      setIsStaffPasswordModalOpen(false);
      window.dispatchEvent(new Event("arena_role_changed"));
      router.push("/create");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringTournament) return;
    setRegistrationError("");
    setRegistrationSuccess("");

    const trimmed = participantName.trim();
    if (!trimmed) {
      setRegistrationError("Please enter your name or team name.");
      return;
    }

    try {
      addParticipant(
        registeringTournament.id,
        trimmed,
        registeringTournament.participant_type
      );
      setRegistrationSuccess(`Successfully registered "${trimmed}"!`);
      setParticipantName("");
      refreshTournaments();
      setTimeout(() => {
        setRegisteringTournament(null);
        setRegistrationSuccess("");
      }, 1500);
    } catch (err: unknown) {
      setRegistrationError(
        err instanceof Error ? err.message : "Registration failed."
      );
    }
  };

  return (
    <div className="min-h-screen bg-arena-bg text-arena-text pb-20">
      <Navbar />

      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-arena-elevated border border-arena-accent/50 text-white text-xs font-semibold shadow-glow animate-in slide-in-from-bottom-5">
          {feedbackToast}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-arena-border/50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-radial-glow pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-arena-accent/15 border border-arena-accent/30 text-arena-highlight text-xs font-bold uppercase tracking-widest mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>Dynamic Bracketing Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight mb-4">
            EVERY MATCH <span className="text-arena-highlight">MATTERS.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-arena-muted mb-8 leading-relaxed">
            The next-generation competitive bracket engine. Register any participant
            count, compute mathematically precise byes automatically, and experience
            cinematic digital victory destructions.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isStaff ? (
              <Link
                href="/create"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold tracking-wide shadow-glow transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Tournament</span>
              </Link>
            ) : (
              <button
                onClick={() => setIsStaffPasswordModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-arena-elevated border border-arena-border hover:border-arena-accent text-white text-xs font-semibold tracking-wide shadow-sm transition active:scale-95"
                title="Organizer profile required to create tournaments"
              >
                <Lock className="w-4 h-4 text-arena-muted" />
                <span>Create Tournament</span>
                <span className="px-1.5 py-0.5 text-[9px] rounded bg-arena-accent/20 text-arena-highlight uppercase font-bold">
                  Staff Only
                </span>
              </button>
            )}

            {tournaments.length > 0 && (
              <Link
                href={`/tournament/${tournaments[0].id}`}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-arena-elevated border border-arena-border hover:border-arena-borderLight text-white text-xs font-semibold transition"
              >
                <span>Latest Tournament</span>
                <ArrowRight className="w-4 h-4 text-arena-muted" />
              </Link>
            )}
          </div>

          {/* Key Platform Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14 text-left">
            <div className="p-4 rounded-2xl bg-arena-card/80 border border-arena-border">
              <div className="text-arena-highlight text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Arbitrary N</span>
              </div>
              <div className="text-sm font-semibold text-white">Dynamic Sizing</div>
              <p className="text-[11px] text-arena-muted mt-1">
                Any valid count (2, 3, 5, 7, 13, 27, 50, 100+). No forced presets.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-arena-card/80 border border-arena-border">
              <div className="text-arena-highlight text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Pure Binary Trees</span>
              </div>
              <div className="text-sm font-semibold text-white">Smart Bye Allocation</div>
              <p className="text-[11px] text-arena-muted mt-1">
                Top seeds advance smoothly into Round 2 without fake opponents.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-arena-card/80 border border-arena-border">
              <div className="text-arena-highlight text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cinematic FX</span>
              </div>
              <div className="text-sm font-semibold text-white">Winner Destroys Loser</div>
              <p className="text-[11px] text-arena-muted mt-1">
                Winner card strikes loser card into geometric digital shards.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-arena-card/80 border border-arena-border">
              <div className="text-arena-highlight text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Data Integrity</span>
              </div>
              <div className="text-sm font-semibold text-white">Safe Corrections</div>
              <p className="text-[11px] text-arena-muted mt-1">
                Automatic recalculation and safe invalidation of downstream matches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tournament Discovery Directory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Tournaments Directory
            </h2>
            <p className="text-xs text-arena-muted mt-1">
              Browse public competitions, review live brackets, or register to compete.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-arena-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-xs outline-none w-full sm:w-60"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-arena-surface p-1 rounded-xl border border-arena-border text-xs">
              {["all", "in_progress", "registration_open", "completed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold capitalize text-xs transition ${
                    statusFilter === st
                      ? "bg-arena-elevated text-white border border-arena-border shadow-sm"
                      : "text-arena-muted hover:text-white"
                  }`}
                >
                  {st === "all" ? "All" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-16 rounded-3xl bg-arena-card border border-arena-border text-center">
              <div className="w-16 h-16 rounded-2xl bg-arena-surface border border-arena-border flex items-center justify-center text-arena-muted mb-4 shadow-sm">
                <Trophy className="w-8 h-8 text-arena-accent" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Tournaments Found</h3>
              <p className="text-xs text-arena-muted max-w-sm mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "No tournaments match your current filters. Try searching for something else."
                  : "No tournaments created yet. Create your first tournament to start building brackets!"}
              </p>
              {isStaff ? (
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Tournament</span>
                </Link>
              ) : (
                <button
                  onClick={() => setIsStaffPasswordModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-arena-elevated border border-arena-border hover:border-arena-accent text-white text-xs font-semibold shadow-sm transition"
                  title="Organizer profile required to create tournaments"
                >
                  <Lock className="w-4 h-4 text-arena-muted" />
                  <span>Create Tournament</span>
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-arena-accent/20 text-arena-highlight uppercase font-bold">
                    Staff Only
                  </span>
                </button>
              )}
            </div>
          ) : (
            filteredTournaments.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-2xl bg-arena-card border border-arena-border hover:border-arena-borderLight p-6 transition duration-200 shadow-sm group"
              >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === "completed"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : t.status === "in_progress"
                        ? "bg-arena-accent/15 text-arena-highlight border border-arena-accent/30"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>

                  <span className="text-[10px] uppercase font-bold text-arena-muted">
                    {t.participant_type}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-arena-highlight transition line-clamp-1 mb-2">
                  {t.name}
                </h3>

                <p className="text-xs text-arena-muted line-clamp-2 mb-6">
                  {t.description || (t.format === "double_elimination" ? "Double elimination tournament." : "Single elimination tournament.")}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs py-3 border-t border-arena-border/50 text-arena-muted mb-4">
                  <span>
                    Format: {t.format === "double_elimination" ? "Double Elimination" : "Single Elimination"}
                  </span>
                  <span>
                    Cap: {t.capacity_limit ? `${t.capacity_limit} max` : "Unlimited"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/tournament/${t.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-arena-elevated border border-arena-border hover:border-arena-accent text-white text-xs font-semibold transition"
                  >
                    <span>View Bracket</span>
                    <ArrowRight className="w-3.5 h-3.5 text-arena-accent" />
                  </Link>

                  {t.registration_status === "open" && t.status !== "completed" && (
                    <button
                      onClick={() => setRegisteringTournament(t)}
                      className="px-3.5 py-2.5 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold transition shadow-glow-sm"
                    >
                      Register
                    </button>
                  )}

                  {isStaff && t.status === "completed" && (
                    <button
                      onClick={() => {
                        setDeleteError("");
                        setTournamentToDelete(t);
                      }}
                      className="p-2.5 rounded-xl bg-arena-surface border border-arena-border hover:border-arena-danger/60 hover:bg-arena-danger/10 text-arena-muted hover:text-arena-danger transition"
                      title="Delete completed tournament"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </section>

      {/* Quick Registration Modal */}
      {registeringTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-arena-bg/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setRegisteringTournament(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Register for {registeringTournament.name}
            </h3>
            <p className="text-xs text-arena-muted mb-4">
              Enter your {registeringTournament.participant_type === "team" ? "team name" : "player display name"} to register.
            </p>

            <form onSubmit={handleRegisterSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-arena-muted mb-1.5">
                  {registeringTournament.participant_type === "team" ? "Team Name" : "Display Name"}
                </label>
                <input
                  type="text"
                  placeholder={
                    registeringTournament.participant_type === "team"
                      ? "e.g. Team Vortex"
                      : "e.g. PhoenixStrike"
                  }
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="w-full px-3 py-2 bg-arena-surface border border-arena-border focus:border-arena-accent rounded-xl text-white text-xs outline-none"
                  autoFocus
                />

                {registrationError && (
                  <p className="text-xs text-arena-danger mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{registrationError}</span>
                  </p>
                )}

                {registrationSuccess && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{registrationSuccess}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRegisteringTournament(null)}
                  className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow-sm"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Completed Tournament Confirmation Modal */}
      {tournamentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-arena-bg/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-arena-elevated border border-arena-danger/40 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setTournamentToDelete(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-arena-danger/20 border border-arena-danger/40 flex items-center justify-center text-arena-danger">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Completed Tournament?</h3>
                <p className="text-xs text-arena-muted">Destructive action</p>
              </div>
            </div>

            <p className="text-xs text-arena-muted mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{tournamentToDelete.name}</strong>? All bracket records, results, and participant logs will be permanently erased. This cannot be undone.
            </p>

            {deleteError && (
              <p className="text-xs text-arena-danger mb-4 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{deleteError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTournamentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl bg-arena-danger hover:bg-red-500 text-white text-xs font-bold transition shadow-glow-danger"
              >
                Delete Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Password Modal */}
      <PasswordModal
        isOpen={isStaffPasswordModalOpen}
        targetRole="organizer"
        onSuccess={handleStaffPasswordSuccess}
        onCancel={() => setIsStaffPasswordModalOpen(false)}
      />
    </div>
  );
}
