"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Search, Mail, Shield, User, GraduationCap } from "lucide-react";
import Image from "next/image";

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

export default function MemberDirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMembers = async () => {
      const supabase = createSupabaseClient();
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

  const getRoleBadge = (role: string) => {
    if (role === 'admin' || role === 'president' || role === 'vice_president') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider border border-danger/20"><Shield size={10}/> {ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
    }
    if (role === 'technical_officer' || role === 'documentation_officer') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20"><User size={10}/> {ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-bg3 text-text2 text-[10px] font-bold uppercase tracking-wider border border-borderDark">{ROLE_LABELS[role] ?? role.replace('_', ' ')}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Member Directory</h1>
        <p className="text-text2">Connect with active IMAT personnel and officers.</p>
      </div>

      <div className="bg-bg2 border border-borderDark rounded-xl p-4 mb-8 flex items-center gap-3 shadow-sm">
         <Search size={20} className="text-text3" />
         <input 
           type="text" 
           placeholder="Search by name, email, or role..." 
           value={search}
           onChange={e => setSearch(e.target.value)}
           className="w-full bg-transparent border-none focus:outline-none text-textDefault placeholder-text3 text-sm"
         />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-text3 font-mono">Loading active personnel...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full p-12 text-center border-dashed border border-borderDark rounded-xl text-text3 font-mono bg-bg2">
            No active members matched your search.
          </div>
        ) : (
          filteredMembers.map(member => (
            <div key={member.id} className="bg-bg border border-borderDark rounded-xl p-5 hover:border-primary/50 transition-colors shadow-sm flex flex-col justify-between">
               
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-textDefault text-lg truncate max-w-[180px]">{member.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full text-primary flex items-center justify-center font-bold text-lg font-mono uppercase border border-primary/20 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/10">
                     {member.avatar_url ? (
                       <Image
                         src={member.avatar_url}
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

               <div className="space-y-3 mt-4 pt-4 border-t border-borderDark/50">
                  <div className="flex items-center gap-3 text-sm text-text2">
                    <Mail size={14} className="text-text3" />
                    <a href={`mailto:${member.email}`} className="hover:text-primary transition-colors truncate">{member.email}</a>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text2">
                    <GraduationCap size={14} className="text-text3" />
                    <span>Level {member.level || "N/A"}</span>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
