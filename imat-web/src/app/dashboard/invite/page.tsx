"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Loader2, MailPlus } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ROLE_LABELS, canAssignRole } from "@/lib/roleHierarchy";
import { sanitizePlainText } from "@/lib/inputSanitizer";

// Roles that can be assigned through an invite. "applicant" is not
// assignable: an invited person becomes a member with a working role.
const INVITABLE_ROLES = Object.keys(ROLE_LABELS).filter(
  (role) => role !== "applicant"
);

export default function InviteMemberPage() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("field_officer");
  const [saving, setSaving] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setRoleLoading(false);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      if (data) setCallerRole(data.role);
      setRoleLoading(false);
    };
    void loadRole();
  }, [supabase]);

  const assignableRoles = INVITABLE_ROLES.filter((r) =>
    canAssignRole(callerRole, r)
  );

  useEffect(() => {
    if (assignableRoles.length > 0 && !assignableRoles.includes(role)) {
      setRole(assignableRoles[0]);
    }
    // Only re-pick when the assignable list first loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callerRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeName = sanitizePlainText(name, 120);
    const safeEmail = email.trim().toLowerCase();
    if (!safeName) {
      toast.error("Enter the person's full name.");
      return;
    }
    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (!role) {
      toast.error("Choose a role for this person.");
      return;
    }

    setSaving(true);
    setManualLink(null);
    try {
      const res = await fetch("/api/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: safeName, email: safeEmail, role }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        toast.error(payload.error ?? "Could not send the invite.");
        setSaving(false);
        return;
      }
      if (payload.emailError) {
        toast.error(
          `${safeName} was added as a member, but the invite email failed: ${payload.emailError}`
        );
        if (payload.inviteLink) setManualLink(payload.inviteLink);
      } else {
        toast.success(`Invite sent to ${safeEmail}.`);
      }
      setName("");
      setEmail("");
      setRole("field_officer");
    } catch {
      toast.error("Could not send the invite.");
    }
    setSaving(false);
  };

  const copyLink = async () => {
    if (!manualLink) return;
    try {
      await navigator.clipboard.writeText(manualLink);
      setLinkCopied(true);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in duration-500 pb-20">
        <Breadcrumbs className="mb-8" />
        <div className="glass-panel rounded-xl p-8 text-center text-text3">
          <Loader2 size={20} className="mx-auto mb-3 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!callerRole || !["owner", "admin"].includes(callerRole)) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in duration-500 pb-20">
        <Breadcrumbs className="mb-8" />
        <div className="glass-panel rounded-xl p-8 text-center">
          <h1 className="text-xl font-bold text-textDefault">Access denied</h1>
          <p className="mt-2 text-sm text-text2">
            Only the owner and admins can invite members directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textDefault flex items-center gap-3">
          <MailPlus className="text-primary" /> Invite Member
        </h1>
        <p className="text-text2 mt-2">
          Invite someone straight into IMAT — no application form. They get
          the acceptance email with a link to set their password (valid for
          24 hours), then they log in. They fill in their matric number and
          level on their profile afterwards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-bg2 border border-soft rounded-xl p-6 md:p-10">
        <div>
          <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Full name</label>
          <input
            required
            type="text"
            maxLength={120}
            placeholder="e.g. Adaeze Okonkwo"
            className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Email address</label>
          <input
            required
            type="email"
            maxLength={254}
            placeholder="e.g. adaeze@example.com"
            className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Role</label>
          <select
            required
            className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault transition-colors"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-primary hover:brightness-110 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? <span className="animate-pulse">Sending invite...</span> : "Send Invite"}
        </button>
      </form>

      {manualLink && (
        <div className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-5">
          <p className="text-sm font-bold text-textDefault">
            The email did not go out — send this link to the person yourself:
          </p>
          <p className="mt-2 text-sm text-text2 break-all">{manualLink}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-110"
          >
            {linkCopied ? "Copied" : "Copy invite link"}
          </button>
        </div>
      )}
    </div>
  );
}
