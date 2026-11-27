"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Clock, Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { sanitizePlainText, sanitizeNumericText } from "@/lib/inputSanitizer";

type VolunteerLog = {
  id: string;
  activity_date: string;
  activity_type: string;
  hours: number;
  description: string | null;
  verified_by: string | null;
  created_at: string;
};

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

function formatLogDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VolunteerHoursPage() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activityDate, setActivityDate] = useState(todayLocal());
  const [activityType, setActivityType] = useState("");
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");

  const loadLogs = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setLoadingLogs(false);
      return;
    }
    setUserId(session.user.id);

    const { data, error } = await supabase
      .from("volunteer_logs")
      .select("id, activity_date, activity_type, hours, description, verified_by, created_at")
      .eq("member_id", session.user.id)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Could not load your volunteer hours.");
    } else {
      setLogs((data ?? []) as VolunteerLog[]);
    }
    setLoadingLogs(false);
  }, [supabase]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totalHours = logs.reduce((sum, log) => sum + Number(log.hours || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Authentication required.");
      return;
    }

    const safeType = sanitizePlainText(activityType, 120);
    const safeDescription = sanitizePlainText(description, 1000);
    const parsedHours = Number(sanitizeNumericText(hours, 4));

    if (!safeType) {
      toast.error("Enter what the activity was.");
      return;
    }
    if (!activityDate) {
      toast.error("Pick the date of the activity.");
      return;
    }
    if (!Number.isFinite(parsedHours) || parsedHours < 0.5 || parsedHours > 12) {
      toast.error("Enter hours between 0.5 and 12.");
      return;
    }
    // One decimal place, matching the NUMERIC(4,1) column.
    const roundedHours = Math.round(parsedHours * 10) / 10;

    setSaving(true);
    const { error } = await supabase.from("volunteer_logs").insert({
      member_id: userId,
      activity_date: activityDate,
      activity_type: safeType,
      hours: roundedHours,
      description: safeDescription || null,
    });

    if (error) {
      console.error("Volunteer log insert failed.");
      toast.error("Could not save your volunteer hours.");
      setSaving(false);
      return;
    }

    toast.success("Volunteer hours logged.");
    setActivityType("");
    setHours("");
    setDescription("");
    setActivityDate(todayLocal());
    setSaving(false);
    await loadLogs();
  };

  return (
    <div className="mx-auto max-w-4xl animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textDefault flex items-center gap-3">
          <Clock className="text-primary" /> Volunteer Hours
        </h1>
        <p className="text-text2 mt-2">
          Log the hours you put into IMAT work — site visits, assessments, advocacy, documentation and more.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-bg2 border border-soft rounded-xl p-6 md:p-10 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Date</label>
            <input
              required
              type="date"
              max={todayLocal()}
              className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault transition-colors"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Activity</label>
            <input
              required
              type="text"
              maxLength={100}
              placeholder="e.g. Drainage clearing, site inspection"
              className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Hours (0.5 – 12)</label>
            <input
              required
              type="number"
              step="0.5"
              min="0.5"
              max="12"
              placeholder="e.g. 2.5"
              className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Description (optional)</label>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="What did you do, and where?"
            className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {saving ? <span className="animate-pulse">Saving hours...</span> : "Log Volunteer Hours"}
        </button>
      </form>

      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-textDefault">My logged hours</h2>
          <p className="text-sm text-text2">
            Total: <span className="font-bold text-textDefault">{totalHours.toFixed(1)} hours</span>
            {logs.length > 0 ? ` across ${logs.length} ${logs.length === 1 ? "entry" : "entries"}` : ""}
          </p>
        </div>

        {loadingLogs ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-text3">
            <Loader2 size={20} className="mx-auto mb-3 animate-spin" />
            Loading your hours...
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            No hours logged yet. Your first entry will show up here.
          </div>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="glass-panel rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-textDefault break-words">{log.activity_type}</p>
                    <p className="text-sm text-text2 mt-1">{formatLogDate(log.activity_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded-full border border-soft bg-bg px-2.5 py-1 text-xs font-bold text-textDefault">
                      {Number(log.hours).toFixed(1)}h
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${
                        log.verified_by
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-soft bg-bg text-text3"
                      }`}
                    >
                      {log.verified_by ? "Verified" : "Pending verification"}
                    </span>
                  </div>
                </div>
                {log.description ? (
                  <p className="mt-2 text-sm text-text2 break-words whitespace-pre-wrap">{log.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
