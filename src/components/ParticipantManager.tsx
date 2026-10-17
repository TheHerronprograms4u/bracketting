"use client";

import React, { useState, useMemo } from "react";
import { Participant, Tournament, UserRole } from "@/types/tournament";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Download,
} from "lucide-react";

interface ParticipantManagerProps {
  tournament: Tournament;
  participants: Participant[];
  currentUserRole: UserRole;
  isLocked: boolean; // if tournament is already in progress / completed
  onAddParticipant: (name: string, seed?: number) => void;
  onBulkAddParticipants: (names: string[]) => void;
  onRenameParticipant: (id: string, newName: string) => void;
  onRemoveParticipant: (id: string) => void;
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  tournament,
  participants,
  currentUserRole,
  isLocked,
  onAddParticipant,
  onBulkAddParticipants,
  onRenameParticipant,
  onRemoveParticipant,
}) => {
  const isOrganizer = currentUserRole === "organizer" || currentUserRole === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Single add form
  const [singleName, setSingleName] = useState("");
  const [singleError, setSingleError] = useState("");

  // Bulk add form
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState("");

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) =>
      p.display_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [participants, searchQuery]);

  // Bulk parsed entries preview
  const bulkParsed = useMemo(() => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const existingLower = new Set(participants.map((p) => p.display_name.toLowerCase()));
    const duplicates: string[] = [];
    const valid: string[] = [];

    lines.forEach((name) => {
      if (existingLower.has(name.toLowerCase()) || valid.includes(name)) {
        duplicates.push(name);
      } else {
        valid.push(name);
      }
    });

    return {
      totalLines: lines.length,
      valid,
      duplicates,
    };
  }, [bulkText, participants]);

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError("");
    const trimmed = singleName.trim();
    if (!trimmed) {
      setSingleError("Please enter a valid competitor name.");
      return;
    }
    const isDup = participants.some(
      (p) => p.display_name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDup) {
      setSingleError(`"${trimmed}" is already registered.`);
      return;
    }

    try {
      onAddParticipant(trimmed);
      setSingleName("");
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      setSingleError(err instanceof Error ? err.message : "Failed to add participant.");
    }
  };

  const handleBulkSubmit = () => {
    setBulkError("");
    if (bulkParsed.valid.length === 0) {
      setBulkError("No new valid participants to add.");
      return;
    }

    try {
      onBulkAddParticipants(bulkParsed.valid);
      setBulkText("");
      setIsBulkModalOpen(false);
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : "Failed to import participants.");
    }
  };

  const handleStartEdit = (p: Participant) => {
    setEditingId(p.id);
    setEditValue(p.display_name);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      onRenameParticipant(id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleExportCSV = () => {
    const header = "Seed,Display Name,Type,Status\n";
    const rows = participants
      .map((p) => `${p.seed ?? ""},"${p.display_name}",${p.participant_type},${p.registration_status}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tournament.name.toLowerCase().replace(/\s+/g, "_")}_roster.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full rounded-2xl bg-arena-card border border-arena-border p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-arena-accent" />
            <h3 className="text-base font-bold text-white">Participants & Roster</h3>
            <span className="px-2 py-0.5 rounded-full bg-arena-surface border border-arena-border text-xs font-semibold text-arena-highlight">
              {participants.length} Registered
            </span>
          </div>
          <p className="text-xs text-arena-muted mt-1">
            Dynamic participant count. Bracket will calculate automatically from this exact roster.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-surface border border-arena-border hover:border-arena-borderLight text-arena-muted hover:text-white text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>

          {isOrganizer && !isLocked && (
            <>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-elevated border border-arena-border hover:border-arena-accent text-arena-text text-xs font-medium transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-arena-accent" />
                <span>Bulk Import</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-semibold shadow-glow-sm transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Competitor</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-arena-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by team or player name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-arena-surface border border-arena-border focus:border-arena-accent text-white text-xs outline-none transition"
        />
      </div>

      {/* Participants Table */}
      <div className="overflow-x-auto rounded-xl border border-arena-border/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-arena-surface/80 text-arena-muted border-b border-arena-border/80 uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="py-2.5 px-4 w-16">Seed</th>
              <th className="py-2.5 px-4">Competitor Name</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Registration</th>
              {isOrganizer && <th className="py-2.5 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-border/40">
            {filteredParticipants.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-arena-muted italic">
                  {searchQuery ? "No participants match your search." : "No participants registered yet."}
                </td>
              </tr>
            ) : (
              filteredParticipants.map((p) => (
                <tr key={p.id} className="hover:bg-arena-surface/40 transition">
                  {/* Seed */}
                  <td className="py-3 px-4 font-bold text-arena-muted">
                    #{p.seed ?? "-"}
                  </td>

                  {/* Name (with inline edit) */}
                  <td className="py-3 px-4">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1.5 max-w-xs">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 bg-arena-elevated border border-arena-accent rounded text-white text-xs outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="p-1 hover:text-emerald-400 text-arena-muted"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 hover:text-red-400 text-arena-muted"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {p.display_name}
                        </span>
                        {isOrganizer && (
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-1 text-arena-muted hover:text-white transition opacity-60 hover:opacity-100"
                            title="Edit Name"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4 capitalize text-arena-muted">
                    {p.participant_type}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Confirmed
                    </span>
                  </td>

                  {/* Actions */}
                  {isOrganizer && (
                    <td className="py-3 px-4 text-right">
                      {!isLocked ? (
                        <button
                          onClick={() => onRemoveParticipant(p.id)}
                          className="p-1 text-arena-muted hover:text-arena-danger transition"
                          title="Remove competitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-arena-muted italic">
                          Locked in bracket
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Single Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Add Competitor</h3>
            <p className="text-xs text-arena-muted mb-4">
              Register an individual player or team into the tournament.
            </p>

            <form onSubmit={handleSingleAdd}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-arena-muted mb-1.5">
                  Competitor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Team Phoenix"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full px-3 py-2 bg-arena-surface border border-arena-border focus:border-arena-accent rounded-xl text-white text-xs outline-none"
                  autoFocus
                />
                {singleError && (
                  <p className="text-xs text-arena-danger mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{singleError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow-sm"
                >
                  Add Competitor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B0F]/85 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-5 h-5 text-arena-accent" />
              <h3 className="text-base font-bold text-white">Bulk Competitor Import</h3>
            </div>
            <p className="text-xs text-arena-muted mb-4">
              Paste or type multiple competitor names, one per line.
            </p>

            <div className="mb-4">
              <textarea
                rows={7}
                placeholder={"Team Alpha\nTeam Omega\nTeam Nova\nTeam Eclipse\nTeam Phantom\nTeam Vortex\nTeam Titan"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-arena-surface border border-arena-border focus:border-arena-accent rounded-xl text-white outline-none"
              />
            </div>

            {/* Validation & Preview Summary */}
            <div className="p-3 rounded-xl bg-arena-surface border border-arena-border mb-4 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-arena-muted">Valid New Competitors:</span>
                <span className="font-bold text-emerald-400">
                  {bulkParsed.valid.length}
                </span>
              </div>
              {bulkParsed.duplicates.length > 0 && (
                <div className="flex items-center justify-between text-amber-400">
                  <span>Skipped Duplicates:</span>
                  <span className="font-bold">{bulkParsed.duplicates.length}</span>
                </div>
              )}
            </div>

            {bulkError && (
              <p className="text-xs text-arena-danger mb-4 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{bulkError}</span>
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkParsed.valid.length === 0}
                className="px-5 py-2 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold transition shadow-glow-sm disabled:opacity-40"
              >
                Import {bulkParsed.valid.length} Competitors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
