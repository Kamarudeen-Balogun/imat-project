"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Search } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { sortByRoleHierarchy, toRoleLabel } from "@/lib/roleHierarchy";

type Member = {
  id: string;
  full_name: string;
  role: string;
  email: string;
  level: number | null;
  avatar_url: string | null;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembers = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, full_name, role, email, level, avatar_url")
        .eq("status", "active")
        .limit(500);

      setMembers(sortByRoleHierarchy((data ?? []) as Member[]));
      setLoading(false);
    };

    void loadMembers();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return sortByRoleHierarchy(
      members.filter((member) =>
        member.full_name.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query)
      )
    );
  }, [members, search]);

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-14 sm:px-6 md:py-20">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-10">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <h1 className="text-3xl md:text-4xl font-bold text-textDefault mb-3">IMAT Members</h1>
      <p className="text-text2 mb-8 max-w-2xl">
        Meet the active officers and members currently running infrastructure monitoring and advocacy across campus.
      </p>

      <div className="glass-panel mb-8 flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search size={18} className="text-text3" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or role..."
          className="w-full bg-transparent text-sm text-textDefault placeholder-text3 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 rounded-2xl border border-borderDark bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-borderDark border-dashed bg-surface p-8 text-center text-text3">
          No members matched your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((member) => {
            const initials = (member.full_name || "M").slice(0, 1).toUpperCase();
            return (
              <article key={member.id} className="glass-panel rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl border border-borderDark overflow-hidden bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-xl font-bold text-textDefault">
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt={member.full_name}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-textDefault truncate">{member.full_name}</h2>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-primary/90 truncate mt-1">
                      {toRoleLabel(member.role)}
                    </p>
                    <p className="text-xs text-text3 truncate mt-2">{member.email}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-borderDark pt-3 flex items-center justify-between text-xs text-text3">
                  <span>Level {member.level ?? "N/A"}</span>
                  <span className="rounded-full border border-borderDark px-2 py-1 uppercase tracking-wider">Active</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
