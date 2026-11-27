"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    const establishSession = async () => {
      try {
        // Supabase invite/recovery links arrive as a URL hash:
        // #access_token=...&refresh_token=...&type=invite
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          // Remove the tokens from the URL so they are not left in history.
          window.history.replaceState(null, "", window.location.pathname);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setTokenError(
            "This invite link is missing or has expired. Please ask an admin to send you a new invite, or go back to the login page."
          );
          return;
        }

        setIsReady(true);
      } catch (error) {
        console.error("Set-password session failed.");
        setTokenError(
          "This invite link is missing or has expired. Please ask an admin to send you a new invite, or go back to the login page."
        );
      }
    };

    establishSession();
  }, [supabase]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      toast.success("Password set successfully! Please sign in.");
      window.location.assign("/login");
    } catch (error) {
      console.error("Set password failed.");
      toast.error((error as Error).message || "Could not set your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-20 sm:px-6">
      <div className="pointer-events-none absolute left-[12%] top-[10%] h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute right-[10%] bottom-[12%] h-40 w-40 rounded-full bg-success/20 blur-3xl" />

      <div className="absolute top-8 left-8">
        <Breadcrumbs className="mb-4" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
            <KeyRound size={32} />
          </div>
          <h1 className="text-3xl font-bold text-textDefault mb-2">Set Your Password</h1>
          <p className="text-text2">Choose a password to activate your IMAT-FUTA account.</p>
        </div>

        {tokenError ? (
          <div className="glass-panel rounded-xl p-8 space-y-6 shadow-2xl text-center">
            <p className="text-sm text-textDefault">{tokenError}</p>
            <Link href="/login" className="inline-block px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-blue-500 transition-colors">
              Go to Login
            </Link>
          </div>
        ) : !isReady ? (
          <div className="glass-panel rounded-xl p-8 shadow-2xl text-center">
            <p className="text-sm text-text2 animate-pulse">Checking your invite link...</p>
          </div>
        ) : (
          <form onSubmit={handleSetPassword} className="glass-panel rounded-xl p-8 space-y-6 shadow-2xl">
            <div>
              <label className="block text-sm font-bold text-textDefault mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-borderDark bg-surfaceStrong p-4 text-sm text-textDefault transition-colors focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-textDefault mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-borderDark bg-surfaceStrong p-4 text-sm text-textDefault transition-colors focus:border-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <span className="animate-pulse">Setting password...</span> : "Set Password"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-text3">
          <p>Already have a password? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
