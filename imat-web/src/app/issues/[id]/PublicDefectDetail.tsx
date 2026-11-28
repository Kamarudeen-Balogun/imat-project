"use client";

import { ArrowLeft, Camera, Clock, ImageOff, MapPin } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import DefectStatusBadge from "@/components/defects/DefectStatusBadge";

// Public read-only defect detail view. Shows only public information:
// no severity numbers, no officer assignments, no internal notes.
export type PublicDefect = {
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

export type LinkedEvidence = {
  id: string;
  title: string;
  description: string;
  before_image_url: string;
  after_image_url: string | null;
};

function getStatusBadge(status: string) {
  return <DefectStatusBadge status={status} />;
}

export default function PublicDefectDetail({
  defect,
  linkedEvidence,
}: {
  defect: PublicDefect;
  linkedEvidence: LinkedEvidence[];
}) {
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

          {linkedEvidence.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text3">
                <Camera size={14} /> Repair evidence
              </h2>
              <div className="space-y-4">
                {linkedEvidence.map((item) => (
                  <div key={item.id} className="rounded-lg border border-soft bg-bg p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-textDefault">{item.title}</h3>
                      <Link href="/evidence" className="text-xs font-semibold text-accent hover:text-accent2">
                        View in the evidence gallery →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-text3">Before</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.before_image_url} alt={`${item.title} before`} className="aspect-[4/3] w-full rounded-md border border-soft object-cover" />
                      </div>
                      <div>
                        <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-text3">After</span>
                        {item.after_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.after_image_url} alt={`${item.title} after`} className="aspect-[4/3] w-full rounded-md border border-soft object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-soft bg-bg3 text-xs text-text3">
                            After photo pending
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-text2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
