"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Camera, CheckCircle, Clock, ImageOff, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

// Public read-only defect detail view. Shows only public information:
// no severity numbers, no officer assignments, no internal notes.
type PublicDefect = {
  id: string;
  title: string;
  description: string;
  category: string;
  defect_type: string;
  affected_area_sqm: number | null;
  status: string;
  created_at: string;
  photos: string[] | null;
  campus_zones: { name: string } | null;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "reported":
      return <span className="inline-flex items-center gap-1.5 rounded border border-danger/30 bg-danger/10 px-3 py-1 font-mono text-xs font-bold text-danger"><Clock size={12} /> Reported</span>;
    case "assessed":
    case "escalated":
      return <span className="inline-flex items-center gap-1.5 rounded border border-warning/35 bg-warning/10 px-3 py-1 font-mono text-xs font-bold text-warning"><AlertCircle size={12} /> Under Assessment</span>;
    case "acknowledged_by_works":
      return <span className="inline-flex items-center gap-1.5 rounded border border-primary/35 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary"><AlertCircle size={12} /> Works Notified</span>;
    case "resolved":
      return <span className="inline-flex items-center gap-1.5 rounded border border-success/35 bg-success/10 px-3 py-1 font-mono text-xs font-bold text-success"><CheckCircle size={12} /> Resolved</span>;
    default:
      return <span className="inline-flex items-center gap-1.5 rounded border border-borderDark bg-bg3 px-3 py-1 font-mono text-xs font-bold uppercase text-text2">{status}</span>;
  }
}

export default function PublicDefectDetailPage() {
  const params = useParams<{ id: string }>();
  const defectId = params.id;
  const [defect, setDefect] = useState<PublicDefect | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDefect = async () => {
      if (!defectId) {
        setLoading(false);
        return;
      }
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("defects")
        .select("id, title, description, category, defect_type, affected_area_sqm, status, created_at, photos, campus_zones(name)")
        .eq("id", defectId)
        .single();
      if (data && !error) {
        setDefect(data as unknown as PublicDefect);
      }
      setLoading(false);
    };
    fetchDefect();
  }, [defectId]);

  if (loading) {
    return (
      <div className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
        <div className="p-12 text-center font-mono text-text3">Loading report...</div>
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
        <Breadcrumbs className="mb-8" />
        <div className="empty-state">
          <p className="font-bold text-textDefault">This issue could not be found.</p>
          <p className="mt-1">It may have been removed, or the link is wrong.</p>
          <Link href="/issues" className="btn btn-outline btn-sm mt-4">
            Back to the tracker
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <Link
        href="/issues"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-text2 transition-colors hover:text-primary"
      >
        <ArrowLeft size={16} /> Back to the tracker
      </Link>

      <div className="card overflow-hidden">
        <div className="border-b border-soft p-5 sm:p-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded border border-soft bg-bg px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-text3">
              {defect.id}
            </span>
            {getStatusBadge(defect.status)}
            <span className="rounded border border-soft bg-bg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text2">
              {defect.category}
            </span>
          </div>
          <h1 className="text-2xl font-black leading-tight text-textDefault sm:text-3xl">
            {defect.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text3">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} /> {defect.campus_zones?.name || "Unspecified zone"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> Reported {formatDistanceToNow(new Date(defect.created_at), { addSuffix: true })}
            </span>
            {defect.affected_area_sqm ? (
              <span>{defect.affected_area_sqm} m² affected</span>
            ) : null}
          </div>
        </div>

        <div className="space-y-8 p-5 sm:p-7">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text3">
              <Camera size={14} /> Photographic evidence
            </h2>
            {defect.photos && defect.photos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {defect.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Evidence ${i + 1} for ${defect.title}`}
                    className="aspect-video w-full rounded-lg border border-soft object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-soft bg-bg p-8 text-sm italic text-text3">
                <ImageOff size={16} /> No photos were attached to this report.
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-xs font-mono uppercase tracking-wider text-text3">
              What was reported
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text2 sm:text-base">
              {defect.description}
            </p>
            <p className="mt-3 text-xs text-text3">
              {defect.category} &gt; {defect.defect_type}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/report" className="btn btn-accent w-full sm:w-auto">
              Report a similar issue
            </Link>
            <Link href="/issues" className="btn btn-outline w-full sm:w-auto">
              View all issues
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
