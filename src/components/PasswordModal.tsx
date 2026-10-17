"use client";

import React, { useState } from "react";
import { verifyStaffPassword } from "@/lib/storage";
import { Lock, Eye, EyeOff, ShieldCheck, X, AlertCircle } from "lucide-react";

interface PasswordModalProps {
  isOpen: boolean;
  targetRole: "organizer" | "admin";
  onSuccess: (role: "organizer" | "admin", password?: string) => void;
  onCancel: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  targetRole,
  onSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter the access password.");
      return;
    }

    if (verifyStaffPassword(password)) {
      const pwd = password;
      setPassword("");
      setError("");
      onSuccess(targetRole, pwd);
    } else {
      setError("Incorrect password. Access denied.");
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onCancel();
  };

  const roleLabel = targetRole === "admin" ? "Admin" : "Organizer";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-arena-bg/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-arena-elevated border border-arena-border rounded-2xl p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-arena-surface border border-arena-border text-arena-muted hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-arena-accent/20 border border-arena-accent flex items-center justify-center text-arena-highlight shadow-glow-sm">
            <Lock className="w-5 h-5 text-arena-accent" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {roleLabel} Profile Authentication
            </h3>
            <p className="text-xs text-arena-muted">
              Enter the staff password to unlock {roleLabel} privileges.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-arena-muted mb-1.5">
              Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-3.5 py-2.5 bg-arena-surface border border-arena-border focus:border-arena-accent rounded-xl text-white text-xs outline-none pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-arena-muted hover:text-white"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-arena-danger mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs text-arena-muted hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-arena-accent hover:bg-arena-accentHover text-white text-xs font-bold shadow-glow-sm transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Unlock {roleLabel}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
