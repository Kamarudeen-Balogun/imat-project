"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Mail, Shield, User, GraduationCap } from "lucide-react";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GooeyInput } from "@/components/ui/gooey-input";
import { toast } from "react-hot-toast";

type Member = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  level: number;
  joined_at: string;
  avatar_url: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  president: "President",
  vice_president: "Vice President",
  documentation_officer: "Documentation Officer",
  field_officer: "Field Officer",
  advocacy_officer: "Advocacy Officer",
  technical_officer: "Technical Officer",
  faculty_advisor: "Faculty Advisor",
  works_dept: "Works Dept Liaison",
  applicant: "Applicant",
};

// Display order for the role-change picker.
const ROLE_OPTIONS = [
  "owner",
  "admin",
  "president",
  "vice_president",
  "technical_officer",
  "documentation_officer",
  "field_officer",
  "advocacy_officer",
  "faculty_advisor",
  "works_dept",
];

export default function MemberDirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createSupabaseClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (profile) setCallerRole(profile.role);
      }

      // Because we are logged in, RLS allows us to fetch active 'users'
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("status", "active")
        .order("role", { ascending: true }); // Groups roles together roughly

      if (data && !error) {
        setMembers(data as Member[]);
      }
      setLoading(false);
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const canManageRoles = callerRole === "owner" || callerRole === "admin";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  const handleRoleSave = async (member: Member) => {
    const nextRole = roleDrafts[member.id] ?? member.role;
    if (nextRole === member.role) return;

    setSavingRoleId(member.id);
    try {
      const res = await fetch(`/api/members/${member.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || "Could not update this member's role.");
      }

      toast.success(`${member.full_name} is now ${ROLE_LABELS[nextRole] ?? nextRole}.`);
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? { ...item, role: nextRole } : item))
      );
      setRoleDrafts((current) => {
        const next = { ...current };
        delete next[member.id];
        return next;
      });
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong. Please try again.");
    } finally {
      setSavingRoleId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'owner' || role === 'admin' || role === 'president' || role === 'vice_president') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider border border-danger/20"><Shield size={10}/> {ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
    }
    if (role === 'technical_officer' || role === 'documentation_officer') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20"><User size={10}/> {ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg3 text-text2 text-[10px] font-bold uppercase tracking-wider border border-soft">{ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
  };

   return (
     <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">

       <Breadcrumbs className="mb-8" />

       <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Member Directory</h1>
        <p className="text-text2">Connect with active IMAT personnel and officers.</p>
      </div>

      <div className="mb-8">
         <GooeyInput
           placeholder="Search by name, email, or role..."
           value={search}
           onChange={setSearch}
           onSearch={setSearch}
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-text3 font-mono">Loading active personnel...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full empty-state">
            No active members matched your search.
          </div>
        ) : (
          filteredMembers.map(member => {
            const isLastOwner = member.role === "owner" && ownerCount <= 1;
            const draftRole = roleDrafts[member.id] ?? member.role;
            const roleChanged = draftRole !== member.role;
            // Keep a legacy role visible (not assignable) if it is not in the picker.
            const rolePickerOptions = ROLE_OPTIONS.includes(member.role)
              ? ROLE_OPTIONS
              : [member.role, ...ROLE_OPTIONS];

            return (
            <div key={member.id} className="glass-panel flex flex-col justify-between rounded-xl p-5 transition-colors hover:border-primary/50">

               <div className="flex justify-between items-start gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-textDefault text-lg break-words leading-snug">{member.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                  <div className="w-10 h-10 shrink-0 rounded-full text-primary flex items-center justify-center font-bold text-lg font-mono uppercase border border-primary/20 overflow-hidden bg-primary/10">
                     {member.avatar_url ? (
                       <Image
                         src={member.avatar_url && member.avatar_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(member.avatar_url) : member.avatar_url}
                         alt={member.full_name}
                         width={40}
                         height={40}
                         unoptimized
                         className="w-full h-full object-cover"
                       />
                     ) : (
                       member.full_name.charAt(0)
                     )}
                  </div>
               </div>

               <div className="space-y-3 mt-4 pt-4 border-t border-soft">
                  <div className="flex items-center gap-3 text-sm text-text2">
                    <Mail size={14} className="text-text3" />
                    <a href={`mailto:${member.email}`} className="hover:text-primary transition-colors truncate">{member.email}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text2">
                    <GraduationCap size={14} className="text-text3" />
                    <span>Level&nbsp;{member.level || "N/A"}</span>
                  </div>
               </div>

               {canManageRoles && (
                 <div className="mt-4 pt-4 border-t border-soft">
                   <label className="block text-xs font-bold uppercase tracking-wider text-text3 mb-2">
                     Change role
                   </label>
                   <div className="flex flex-col gap-2 sm:flex-row">
                     <select
                       value={draftRole}
                       disabled={isLastOwner || savingRoleId === member.id}
                       onChange={(e) =>
                         setRoleDrafts((current) => ({ ...current, [member.id]: e.target.value }))
                       }
                       className="min-w-0 flex-1 rounded-lg border border-borderDark bg-surfaceStrong px-3 py-2 text-sm text-textDefault transition-colors focus:border-primary focus:outline-none disabled:opacity-50"
                     >
                       {rolePickerOptions.map((role) => (
                         <option key={role} value={role}>
                           {ROLE_LABELS[role] ?? role.replace(/_/g, " ")}
                         </option>
                       ))}
                     </select>
                     <button
                       type="button"
                       disabled={!roleChanged || isLastOwner || savingRoleId === member.id}
                       onClick={() => handleRoleSave(member)}
                       className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-white transition-colors hover:brightness-110 disabled:opacity-50 sm:w-auto sm:shrink-0"
                     >
                       {savingRoleId === member.id ? "Saving..." : "Save"}
                     </button>
                   </div>
                   {isLastOwner && (
                     <p className="mt-2 text-xs text-warning">
                       Last owner — assign another owner before changing this role.
                     </p>
                   )}
                 </div>
               )}
            </div>
            );
          })
        )}
      </div>

    </div>
  );
}
