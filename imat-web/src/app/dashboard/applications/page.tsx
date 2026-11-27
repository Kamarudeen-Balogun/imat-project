"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CheckCircle2, GraduationCap, Mail, ShieldAlert, User, XCircle } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roleHierarchy";

const REVIEWER_ROLES = ["owner", "admin", "president", "technical_officer"];

// Roles a reviewer may assign on accept. Owner/admin are reserved for owners.
const BASE_ASSIGNABLE_ROLES = [
  "president",
  "vice_president",
  "documentation_officer",
  "field_officer",
  "advocacy_officer",
  "technical_officer",
  "faculty_advisor",
  "works_dept",
];
const OWNER_ASSIGNABLE_ROLES = ["owner", "admin", ...BASE_ASSIGNABLE_ROLES];

const ROLE_LABELS_WITH_OWNER: Record<string, string> = {
  ...ROLE_LABELS,
  owner: "Owner",
};

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-warning/10 text-warning border-warning/20",
  under_review: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  accepted: "bg-success/10 text-success border-success/20",
  waitlisted: "bg-accent/10 text-accent border-accent/20",
  rejected: "bg-danger/10 text-danger border-danger/20",
};

type Application = {
  id: string;
  applicant_name: string;
  email: string;
  matric_no: string;
  level: number;
  cgpa: number | null;
  cgpa_above_3: boolean | null;
  phone: string | null;
  gender: string | null;
  leadership: string | null;
  working_groups: string[] | null;
  skills: string[] | null;
  time_commitment: string | null;
  referee_name: string | null;
  referee_email: string | null;
  role_preference_1: string;
  role_preference_2: string | null;
  role_preference_3: string | null;
  motivation_statement: string;
  status: string;
  created_at: string;
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (data) setCallerRole(data.role);
      }

      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Could not load applications.");
      } else if (data) {
        // Submitted applications first, then newest first.
        const sorted = [...(data as Application[])].sort((a, b) => {
          const aPending = a.status === "submitted" ? 0 : 1;
          const bPending = b.status === "submitted" ? 0 : 1;
          if (aPending !== bPending) return aPending - bPending;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setApplications(sorted);
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const canReview = callerRole !== null && REVIEWER_ROLES.includes(callerRole);
  const assignableRoles =
    callerRole === "owner" ? OWNER_ASSIGNABLE_ROLES : BASE_ASSIGNABLE_ROLES;

  const openReview = (app: Application) => {
    const preferred = app.role_preference_1;
    setSelectedRole(assignableRoles.includes(preferred) ? preferred : assignableRoles[0]);
    setNotes("");
    setReviewingId(app.id);
  };

  const handleDecision = async (app: Application, decision: "accept" | "reject") => {
    if (decision === "accept" && !selectedRole) {
      toast.error("Choose a role for this applicant first.");
      return;
    }

    setSubmitting(true);
    try {
      const body =
        decision === "accept"
          ? { role: selectedRole, notes: notes.trim() }
          : { notes: notes.trim() };

      const res = await fetch(`/api/applications/${app.id}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || `Could not ${decision} this application.`);
      }

      // A failed acceptance email must never be silent: the accept API
      // returns emailError (and inviteLink, when one was generated) even
      // on success, so surface it here instead of only a success toast.
      if (decision === "accept" && payload.emailError) {
        toast.error(
          `${app.applicant_name} was accepted, but the invite email failed: ${payload.emailError}` +
            (payload.inviteLink
              ? " The invite link was still generated, so you can copy it manually and send it to the applicant."
              : "")
        );
      } else {
        toast.success(
          decision === "accept"
            ? `${app.applicant_name} accepted as ${ROLE_LABELS_WITH_OWNER[selectedRole] ?? selectedRole}.`
            : `${app.applicant_name}'s application was rejected.`
        );
      }
      setApplications((current) =>
        current.map((item) =>
          item.id === app.id
            ? { ...item, status: decision === "accept" ? "accepted" : "rejected" }
            : item
        )
      );
      setReviewingId(null);
    } catch (error) {
      toast.error((error as Error).message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">
        <Breadcrumbs className="mb-8" />
        <div className="p-12 text-center text-text3 font-mono">Loading applications...</div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">
        <Breadcrumbs className="mb-8" />
        <div className="glass-panel rounded-xl p-8 text-center">
          <ShieldAlert size={32} className="mx-auto mb-4 text-danger" />
          <h1 className="text-2xl font-bold text-textDefault mb-2">Access denied</h1>
          <p className="text-text2">
            Only the owner, admins, the president and the technical officer can review
            membership applications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 py-6 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">
          Membership Applications
        </h1>
        <p className="text-text2">
          Review submitted applications, assign a role on accept, or reject with a note.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          No applications yet.
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((app) => {
            const isPending = app.status === "submitted" || app.status === "under_review";
            const isReviewing = reviewingId === app.id;
            const preferences = [app.role_preference_1, app.role_preference_2, app.role_preference_3]
              .filter((r): r is string => Boolean(r))
              .map((role) => ROLE_LABELS_WITH_OWNER[role] ?? role.replace(/_/g, " "))
              .join(" · ");

            return (
              <article key={app.id} className="glass-panel rounded-xl p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-textDefault">{app.applicant_name}</h2>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_STYLES[app.status] ?? "bg-bg3 text-text2 border-soft"}`}
                      >
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text2">
                      <span className="flex items-center gap-2">
                        <Mail size={14} className="text-text3" />
                        <a href={`mailto:${app.email}`} className="hover:text-primary truncate">
                          {app.email}
                        </a>
                      </span>
                      <span className="flex items-center gap-2">
                        <User size={14} className="text-text3" />
                        {app.matric_no}
                      </span>
                      <span className="flex items-center gap-2">
                        <GraduationCap size={14} className="text-text3" />
                        Level {app.level} · CGPA above 3.00:{" "}
                        {app.cgpa_above_3 === null || app.cgpa_above_3 === undefined
                          ? "—"
                          : app.cgpa_above_3
                            ? "Yes"
                            : "No"}
                      </span>
                      {app.phone && (
                        <span className="flex items-center gap-2">
                          <User size={14} className="text-text3" />
                          {app.phone}
                        </span>
                      )}
                      {app.gender && (
                        <span className="flex items-center gap-2">
                          <User size={14} className="text-text3" />
                          {app.gender}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-text2">
                      <span className="font-bold text-textDefault">Role preferences: </span>
                      {preferences || "—"}
                    </p>
                    {(app.working_groups?.length ||
                      app.skills?.length ||
                      app.time_commitment ||
                      app.leadership ||
                      app.referee_name ||
                      app.referee_email) && (
                      <div className="mt-2 space-y-1 text-sm text-text2">
                        {app.working_groups?.length ? (
                          <p>
                            <span className="font-bold text-textDefault">Working groups: </span>
                            {app.working_groups.join(" · ")}
                          </p>
                        ) : null}
                        {app.skills?.length ? (
                          <p>
                            <span className="font-bold text-textDefault">Skills: </span>
                            {app.skills.join(" · ")}
                          </p>
                        ) : null}
                        {app.time_commitment ? (
                          <p>
                            <span className="font-bold text-textDefault">Time commitment: </span>
                            {app.time_commitment}
                          </p>
                        ) : null}
                        {app.leadership ? (
                          <p>
                            <span className="font-bold text-textDefault">Leadership experience: </span>
                            {app.leadership}
                          </p>
                        ) : null}
                        {app.referee_name || app.referee_email ? (
                          <p>
                            <span className="font-bold text-textDefault">Referee: </span>
                            {[app.referee_name, app.referee_email]
                              .filter((v): v is string => Boolean(v))
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-text2">
                      {app.motivation_statement.length > 220
                        ? `${app.motivation_statement.slice(0, 220)}…`
                        : app.motivation_statement}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs font-mono text-text3">
                    Submitted {formatDate(app.created_at)}
                  </div>
                </div>

                {isPending && !isReviewing && (
                  <div className="mt-4 flex gap-3 border-t border-soft pt-4">
                    <button
                      type="button"
                      onClick={() => openReview(app)}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                    >
                      Review application
                    </button>
                  </div>
                )}

                {isPending && isReviewing && (
                  <div className="mt-4 space-y-4 border-t border-soft pt-4">
                    <div>
                      <label className="block text-sm font-bold text-textDefault mb-2">
                        Assign role on accept
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full rounded-lg border border-borderDark bg-surfaceStrong p-3 text-sm text-textDefault transition-colors focus:border-primary focus:outline-none md:w-80"
                      >
                        {assignableRoles.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS_WITH_OWNER[role] ?? role.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      {callerRole !== "owner" && (
                        <p className="mt-1 text-xs text-text3">
                          Owner and admin roles can only be assigned by the owner.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-textDefault mb-2">
                        Review notes
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Notes for the record (sent with the decision)..."
                        className="w-full rounded-lg border border-borderDark bg-surfaceStrong p-3 text-sm text-textDefault transition-colors focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecision(app, "accept")}
                        className="flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Accept
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDecision(app, "reject")}
                        className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setReviewingId(null)}
                        className="rounded-lg border border-soft px-4 py-2 text-sm font-bold text-text2 transition-colors hover:text-textDefault"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
