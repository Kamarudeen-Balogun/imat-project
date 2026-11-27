"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PasswordField } from "@/components/PasswordField";

function hasSupabaseAuthCookie() {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/i.test(document.cookie);
}

async function waitForAuthCookie(timeoutMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (hasSupabaseAuthCookie()) {
      return true;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return hasSupabaseAuthCookie();
}

async function waitForStoredSession(supabase: ReturnType<typeof createSupabaseClient>, timeoutMs = 2000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return session;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = useMemo(() => createSupabaseClient(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const session = loginData.session ?? (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error("Login succeeded but the session was not established.");
      }

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      const storedSession = await waitForStoredSession(supabase);
      if (!storedSession) {
        throw new Error("Login succeeded but the browser could not store the session.");
      }

      toast.success("Login successful!");
      await waitForAuthCookie();
      window.location.assign("/dashboard");
    } catch (error) {
      console.error("Login failed.");
      toast.error((error as Error).message || "Invalid login credentials. Please try again.");
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
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-black text-textDefault mb-2">Member Portal</h1>
          <p className="text-text2">Sign in to access your administrative dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="glass-panel rounded-xl p-8 space-y-6 shadow-2xl">
          <div>
            <label className="block text-sm font-bold text-textDefault mb-2">School Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@futa.edu.ng" 
              required 
              className="field" 
            />
          </div>

          <div>
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />
            <div className="mt-2 text-right">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? <span className="animate-pulse">Authenticating...</span> : "Member Login"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-text3">
          <p>Don&apos;t have an account? <Link href="/apply" className="text-primary hover:underline">Apply to join</Link></p>
        </div>
      </div>
    </div>
  );
}
