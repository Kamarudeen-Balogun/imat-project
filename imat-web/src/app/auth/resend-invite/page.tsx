"use client";

import { useState } from "react";
import { MailPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const GENERIC_SUCCESS =
  "If your application was accepted and you haven't set a password yet, a new invite link has been sent.";

export default function ResendInvitePage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        toast.error("Too many requests. Please wait and try again.");
        return;
      }

      // The API always returns { ok: true } whether or not an invite is
      // sent, so the same message is shown either way.
      setIsSent(true);
    } catch {
      console.error("Resend invite request failed.");
      // Never reveal whether the email qualifies, even on failure.
      setIsSent(true);
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
            <MailPlus size={32} />
          </div>
          <h1 className="text-3xl font-bold text-textDefault mb-2">Resend Invite Link</h1>
          <p className="text-text2">Enter the email address you applied with and we&apos;ll send you a fresh link to set your password.</p>
        </div>

        {isSent ? (
          <div className="glass-panel rounded-xl p-8 space-y-6 shadow-2xl text-center">
            <p className="text-sm text-textDefault">{GENERIC_SUCCESS}</p>
            <p className="text-sm text-text2">The link is valid for 24 hours. Check your inbox (and spam folder) for it.</p>
            <p className="text-sm text-text2">Already signed in before? Use <Link href="/auth/forgot-password" className="text-primary hover:underline">Forgot password</Link> on the login page instead.</p>
            <Link href="/login" className="inline-block px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-blue-500 transition-colors">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-8 space-y-6 shadow-2xl">
            <div>
              <label className="block text-sm font-bold text-textDefault mb-2">School Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. officer@futa.edu.ng"
                required
                autoComplete="email"
                className="field"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? <span className="animate-pulse">Sending...</span> : "Send New Invite Link"}
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
