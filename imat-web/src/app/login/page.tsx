"use client";

import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createSupabaseClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Login succeeded but the session was not established.");
      }

      toast.success("Login successful!");
      window.location.replace("/dashboard");
    } catch (error) {
      console.error("Login failed:", (error as Error).message);
      toast.error((error as Error).message || "Invalid login credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative px-6 py-20">
      <div className="absolute top-8 left-8">
        <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-3xl font-bold text-textDefault mb-2">Member Portal</h1>
          <p className="text-text2">Sign in to access your administrative dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-bg2 border border-borderDark rounded-xl p-8 space-y-6 shadow-2xl">
          <div>
            <label className="block text-sm font-bold text-textDefault mb-2">School Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. officer@futa.edu.ng" 
              required 
              className="w-full p-4 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault text-sm transition-colors" 
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-textDefault">Password</label>
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required 
              className="w-full p-4 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault text-sm transition-colors" 
            />
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
