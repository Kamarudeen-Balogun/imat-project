"use client";

import { useState, FormEvent, useEffect, ChangeEvent, useCallback } from "react";
import { AlertTriangle, Camera, CheckCircle, ClipboardList, Crosshair, MapPin, ShieldCheck, UploadCloud, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { enqueueReportUpload, getQueuedUploadCount, QueuedReportPayload, setTurnstileTokenForNextQueuedUpload } from "@/lib/reportUploadQueue";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { sanitizePlainText } from "@/lib/inputSanitizer";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { TURNSTILE_DEV_BYPASS_TOKEN, isTurnstileDevBypassEnabled } from "@/lib/turnstile";

type Zone = { id: string; name: string };
const UPLOAD_SYNC_TAG = "imat-report-upload-sync";
const REPORT_DRAFT_KEY = "imat_public_report_draft_v1";

type ReportDraft = {
  title: string;
  category: string;
  defect_type: string;
  severity: string;
  campus_zone_id: string;
  affected_area_sqm: string;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
};

const DEFAULT_DRAFT: ReportDraft = {
  title: "",
  category: "road",
  defect_type: "",
  severity: "",
  campus_zone_id: "",
  affected_area_sqm: "",
  description: "",
  location_lat: null,
  location_lng: null,
};

const DEFECT_TYPES: Record<string, string[]> = {
  road: ["Pothole", "Edge Bleeding", "Surface Cracking", "Washed Out", "Other"],
  walkway: ["Cracked Concrete", "Broken Interlock", "Uneven Surface", "Muddy Pooling", "Other"],
  drainage: ["Blocked/Silted", "Broken Slab", "Collapsed Wall", "Overgrown Vegetation", "Other"],
  structure: ["Wall Crack", "Roof Leak", "Broken Window", "Plumbing Leak", "Other"],
  other: ["Vegetation Overgrowth", "Electrical Hazard", "Signage Broken", "Other"],
};

export default function ReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [pendingQueuedReports, setPendingQueuedReports] = useState(0);
  const [needsVerificationToResume, setNeedsVerificationToResume] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [draft, setDraft] = useState<ReportDraft>(DEFAULT_DRAFT);
  const [locating, setLocating] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const category = draft.category;

  const refreshQueuedReportCount = useCallback(async () => {
    const count = await getQueuedUploadCount().catch(() => 0);
    setPendingQueuedReports(count);
    setNeedsVerificationToResume(count > 0);
  }, []);

  const supportsBackgroundSync = useCallback(() => {
    return typeof window !== "undefined" && "serviceWorker" in navigator;
  }, []);

  const registerAndScheduleBackgroundSync = useCallback(async (): Promise<boolean> => {
    if (!supportsBackgroundSync()) return false;

    try {
      await navigator.serviceWorker.register("/upload-sync-sw.js");

      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) {
        return false;
      }

      if ("sync" in registration) {
        const syncManager = (registration as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }).sync;

        try {
          await syncManager.register(UPLOAD_SYNC_TAG);
        } catch (error) {
          if (error instanceof DOMException && error.name === "InvalidStateError") {
            await new Promise((resolve) => window.setTimeout(resolve, 300));
            await syncManager.register(UPLOAD_SYNC_TAG);
          } else {
            throw error;
          }
        }
      }

      registration.active.postMessage({ type: "PROCESS_UPLOAD_QUEUE" });

      return true;
    } catch {
      console.error("Failed to register background sync.");
      return false;
    }
  }, [supportsBackgroundSync]);

  useEffect(() => {
    const fetchZones = async () => {
      const supabase = createSupabaseClient();
      const { data, error } = await supabase.from('campus_zones').select('id, name');
      if (data && !error) {
        setZones(data);
      }
    };
    fetchZones();
  }, []);

  useEffect(() => {
    void refreshQueuedReportCount();
  }, [refreshQueuedReportCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedDraft = window.localStorage.getItem(REPORT_DRAFT_KEY);
      if (!savedDraft) return;

      const parsed = JSON.parse(savedDraft) as Partial<ReportDraft>;
      setDraft((prev) => ({
        ...prev,
        ...parsed,
      }));
      toast("Restored your saved draft.");
    } catch {
      console.error("Failed to restore report draft.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(REPORT_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [photoPreviews]);

  useEffect(() => {
    const allowedDefectTypes = DEFECT_TYPES[category] || [];
    if (allowedDefectTypes.length === 0) return;

    if (!draft.defect_type || !allowedDefectTypes.includes(draft.defect_type)) {
      setDraft((prev) => ({ ...prev, defect_type: allowedDefectTypes[0] }));
    }
  }, [category, draft.defect_type]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("SyncManager" in window)) {
      return;
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "REPORT_UPLOAD_SYNC_SUCCESS") {
        toast.success("Queued report uploaded successfully.");
        void refreshQueuedReportCount();
      }

      if (event.data?.type === "REPORT_UPLOAD_SYNC_NEEDS_VERIFICATION") {
        setNeedsVerificationToResume(true);
        void refreshQueuedReportCount();
      }

      if (event.data?.type === "REPORT_UPLOAD_SYNC_PENDING") {
        void refreshQueuedReportCount();
      }
    };

    const handleOnline = () => {
      void registerAndScheduleBackgroundSync();
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage as EventListener);
    window.addEventListener("online", handleOnline);
    void registerAndScheduleBackgroundSync();

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage as EventListener);
      window.removeEventListener("online", handleOnline);
    };
  }, [registerAndScheduleBackgroundSync, refreshQueuedReportCount]);

  const clearSelectedPhotos = () => {
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setSelectedPhotos([]);
    setPhotoPreviews([]);
  };

  const clearFormDraft = () => {
    setDraft({
      ...DEFAULT_DRAFT,
      category: "road",
      defect_type: DEFECT_TYPES.road[0],
    });
    clearSelectedPhotos();
    setTurnstileToken("");
    setHoneypot("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REPORT_DRAFT_KEY);
    }
    toast.success("Form cleared.");
  };

  const getLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft((prev) => ({
          ...prev,
          location_lat: position.coords.latitude,
          location_lng: position.coords.longitude,
        }));
        setLocating(false);
        toast.success("GPS coordinates captured.");
      },
      () => {
        console.error("Location capture failed.");
        setLocating(false);
        toast.error("Unable to capture location. Please allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (validFiles.length !== files.length) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
    }

    const availableSlots = Math.max(0, 4 - selectedPhotos.length);
    const filesToAdd = validFiles.slice(0, availableSlots);

    if (filesToAdd.length < validFiles.length) {
      toast("Maximum of 4 images allowed.");
    }

    if (filesToAdd.length === 0) return;

    setSelectedPhotos((prev) => [...prev, ...filesToAdd]);
    setPhotoPreviews((prev) => [...prev, ...filesToAdd.map((file) => URL.createObjectURL(file))]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS;

    if (!cloudName || !uploadPreset) {
      toast("Image upload is not configured yet. The report will be sent without photos.");
      return [];
    }

    setIsUploadingPhotos(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.text().catch(() => "");
          throw new Error(payload || "Image upload failed");
        }

        const data = await response.json();
        uploadedUrls.push(data.secure_url as string);
      }

      return uploadedUrls;
    } catch {
      console.error("Image upload failed.");
      toast("Image upload failed. The report will be sent without photos.");
      return [];
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const queueReportForLaterUpload = async (payload: QueuedReportPayload, photos: File[]) => {
    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS;

    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      toast.error("Offline queueing is not configured yet.");
      return false;
    }

    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await enqueueReportUpload({
      id,
      createdAt: new Date().toISOString(),
      payload,
      photos: photos.map((file) => ({
        name: file.name,
        type: file.type,
        blob: file,
      })),
      verification: {
        turnstileToken: "",
        honeypot: "",
      },
      config: {
        cloudinaryCloudName,
        cloudinaryUploadPreset,
      },
    });

    await refreshQueuedReportCount();
    return true;
  };

  const resumeQueuedUploads = async () => {
    if (!navigator.onLine) {
      toast.error("You need an internet connection to resume queued uploads.");
      return;
    }

    const bypassToken = isTurnstileDevBypassEnabled() ? TURNSTILE_DEV_BYPASS_TOKEN : "";
    const token = turnstileToken.trim() || bypassToken;
    if (!token) {
      toast.error("Complete the bot check first so the queued report can be verified.");
      return;
    }

    const updated = await setTurnstileTokenForNextQueuedUpload(token, honeypot.trim());
    if (!updated) {
      toast.error("There is no queued report waiting to resume.");
      await refreshQueuedReportCount();
      return;
    }

    const scheduled = await registerAndScheduleBackgroundSync();
    if (scheduled) {
      setNeedsVerificationToResume(false);
      toast.success("Queued report sent back for verification and upload.");
      await refreshQueuedReportCount();
    } else {
      toast.error("Unable to schedule the queued upload right now.");
    }
  };

  const submitReportImmediately = async (payload: QueuedReportPayload, photos: File[], token: string, honeypotValue: string) => {
    const uploadedPhotoUrls = await uploadPhotos(photos);

    const response = await fetch("/api/public-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        turnstileToken: token,
        honeypot: honeypotValue,
        photos: uploadedPhotoUrls,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorPayload = (await response.json()) as { error?: string };
        if (errorPayload?.error) {
          errorMessage = errorPayload.error;
        }
      } catch {
        const payloadText = await response.text().catch(() => "");
        if (payloadText) {
          errorMessage = payloadText;
        }
      }

      throw new Error(errorMessage);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formDataObj = new FormData(e.currentTarget);

    const campusZone = (formDataObj.get("campus_zone_id") as string) || null;
    const areaValue = formDataObj.get("affected_area_sqm") as string;
    const parsedArea = areaValue ? Number.parseFloat(areaValue) : null;

    const dataPayload: QueuedReportPayload = {
      title: sanitizePlainText(formDataObj.get("title") as string, 120),
      category: sanitizePlainText(formDataObj.get("category") as string, 20),
      defect_type: sanitizePlainText(formDataObj.get("defect_type") as string, 120),
      severity: Number.parseInt(formDataObj.get("severity") as string, 10),
      campus_zone_id: campusZone,
      affected_area_sqm: Number.isNaN(parsedArea as number) ? null : parsedArea,
      description: sanitizePlainText(formDataObj.get("description") as string, 3000),
      location_lat: draft.location_lat,
      location_lng: draft.location_lng,
    };

    const bypassToken = isTurnstileDevBypassEnabled() ? TURNSTILE_DEV_BYPASS_TOKEN : "";
    const turnstileValue = turnstileToken.trim() || bypassToken;
    const honeypotValue = honeypot.trim();

    try {
      if (!navigator.onLine) {
        const queued = await queueReportForLaterUpload(dataPayload, selectedPhotos);
        if (queued) {
          toast.success("Report saved locally. Come back online and complete the bot check to finish uploading.", { duration: 6500 });
          clearFormDraft();
        }
        return;
      }

      if (!turnstileValue) {
        toast.error("Please complete the bot check before submitting.");
        return;
      }

      await submitReportImmediately(dataPayload, selectedPhotos, turnstileValue, honeypotValue);

      toast.success("Defect successfully reported! Thank you for your vigilance.", { duration: 6000 });
      clearFormDraft();
    } catch (error) {
      console.error("Report upload failed.");
      const message = error instanceof Error ? error.message : "Failed to submit the report. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

   return (
     <div className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
       <Breadcrumbs className="mb-8" />

      <div className="mb-8 grid gap-6 rounded-lg border border-borderDark bg-asphalt p-5 text-white shadow-lg sm:p-7 lg:grid-cols-[1fr_18rem]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-accent">
            <ClipboardList size={13} /> Field Intelligence Intake
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Report Infrastructure Defect</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Submit a structured defect ticket with category, severity, location, and evidence so IMAT can route it for technical review.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {[
            { icon: ClipboardList, label: "Classify" },
            { icon: Crosshair, label: "Locate" },
            { icon: Camera, label: "Evidence" },
          ].map((item, index) => (
            <div key={item.label} className="rounded border border-white/10 bg-white/[0.04] p-3">
              <div className="mb-2 flex items-center justify-between">
                <item.icon size={16} className="text-accent" />
                <span className="font-mono text-[9px] text-slate-500">0{index + 1}</span>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 flex items-start gap-3 rounded-lg border border-warning/40 bg-warningDim p-4 text-sm text-textDefault">
        <AlertTriangle className="shrink-0 text-warning" size={20} />
        <div>
          <strong className="mb-1 block font-black uppercase tracking-[0.12em]">Immediate Hazard Protocol</strong>
          If this defect poses an immediate threat to life or property, contact the Works Department directly alongside submitting this report.
        </div>
      </div>

      {pendingQueuedReports > 0 && (
        <div className="mb-8 rounded-lg border border-primary/25 bg-primary/10 p-4 text-sm text-textDefault">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-sm font-black">{pendingQueuedReports} offline report{pendingQueuedReports > 1 ? "s" : ""} saved locally</strong>
              <span className="text-text2">Complete the bot check while online, then resume the queue to upload it safely.</span>
            </div>
            <button
              type="button"
              onClick={resumeQueuedUploads}
              className="inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isUploadingPhotos}
            >
              Resume queued upload
            </button>
          </div>
          {needsVerificationToResume && (
            <p className="mt-2 text-xs text-text3">Queued reports need a fresh Turnstile token before the server will accept them.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="command-surface space-y-7 rounded-lg p-4 md:p-7">
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        
        <section className="rounded-lg border border-borderDark bg-bg p-4 sm:p-5">
          <div className="mb-6 flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/40 bg-accent/10 font-mono font-black text-accent">01</div>
             <div>
               <h2 className="text-xl font-black text-textDefault">Classify Defect</h2>
               <p className="text-xs text-text3">Structured fields make the report routeable later.</p>
             </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-black text-textDefault">Short Title <span className="text-danger">*</span></label>
              <input name="title" type="text" maxLength={80} placeholder="e.g. Massive pothole near ETF building" required value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className="field" />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-textDefault">Category <span className="text-danger">*</span></label>
                <select name="category" value={category} onChange={e => setDraft((prev) => ({ ...prev, category: e.target.value }))} required className="field">
                  <option value="drainage">Drainage</option>
                  <option value="road">Road</option>
                  <option value="walkway">Walkway</option>
                  <option value="structure">Structure (Building)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-textDefault">Type of Defect <span className="text-danger">*</span></label>
                <select name="defect_type" value={draft.defect_type} onChange={(e) => setDraft((prev) => ({ ...prev, defect_type: e.target.value }))} required className="field">
                  <option value="">Select specific type...</option>
                  {DEFECT_TYPES[category]?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-textDefault">Severity Level <span className="text-danger">*</span></label>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { val: 1, label: "Cosmetic", desc: "Surface issues, no risk" },
                  { val: 2, label: "Minor", desc: "Limited function impact" },
                  { val: 3, label: "Moderate", desc: "Affects safety/usage" },
                  { val: 4, label: "Critical", desc: "Active hazard" },
                  { val: 5, label: "Emergency", desc: "Imminent danger" }
                ].map(sev => {
                  const isSelected = draft.severity === String(sev.val);
                  return (
                    <label key={sev.val} className={`flex cursor-pointer flex-col gap-1.5 rounded-md border p-3 transition-colors ${isSelected ? "border-accent bg-accent/10" : "border-borderDark bg-surfaceStrong hover:border-accent"} ${sev.val >= 4 ? "text-danger" : "text-textDefault"}`}>
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <input type="radio" name="severity" value={sev.val} checked={isSelected} onChange={(e) => setDraft((prev) => ({ ...prev, severity: e.target.value }))} required className="h-4 w-4 shrink-0 cursor-pointer accent-accent" />
                          <strong className="text-sm">{sev.label}</strong>
                        </span>
                        <strong className="font-mono text-xs">LVL {sev.val}</strong>
                      </span>
                      <span className="text-[11px] leading-tight text-text3">{sev.desc}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-borderDark bg-bg p-4 sm:p-5">
          <div className="mb-6 flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10 font-mono font-black text-primary">02</div>
             <div>
               <h2 className="text-xl font-black text-textDefault">Locate Asset</h2>
               <p className="text-xs text-text3">Zone and coordinates speed up field verification.</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-textDefault">Campus Zone</label>
                <select name="campus_zone_id" value={draft.campus_zone_id} onChange={(e) => setDraft((prev) => ({ ...prev, campus_zone_id: e.target.value }))} className="field">
                  <option value="">Select general zone (optional)...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-textDefault">Estimated Area (sq meters)</label>
                <input name="affected_area_sqm" value={draft.affected_area_sqm} onChange={(e) => setDraft((prev) => ({ ...prev, affected_area_sqm: e.target.value }))} type="number" step="0.1" placeholder="e.g. 5" className="field" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-black text-textDefault">Precise Location (GPS Coordinates)</label>
              <button
                type="button"
                onClick={getLocation}
                disabled={locating}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/10 p-3 font-bold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <MapPin size={16} />
                {locating
                  ? "Capturing location..."
                  : draft.location_lat !== null && draft.location_lng !== null
                    ? `LAT ${draft.location_lat.toFixed(5)} / LNG ${draft.location_lng.toFixed(5)}`
                    : "Use my GPS location"}
              </button>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-black text-textDefault">Detailed Description & Exact Location <span className="text-danger">*</span></label>
              <textarea name="description" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Describe the defect and exactly where it is so field officers can easily find it..." required className="field"></textarea>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-borderDark bg-bg p-4 sm:p-5">
          <div className="mb-6 flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center rounded-md border border-warning/40 bg-warning/10 font-mono font-black text-warning">03</div>
             <div>
               <h2 className="text-xl font-black text-textDefault">Photographic Evidence</h2>
               <p className="text-xs text-text3">Upload up to four field images.</p>
             </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {photoPreviews.map((preview, idx) => (
                <div key={preview} className="relative aspect-square overflow-hidden rounded-md border border-borderDark bg-bg">
                  <Image src={preview} alt={`Selected evidence ${idx + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute right-2 top-2 rounded-md bg-black/70 p-1 text-white transition-colors hover:bg-danger"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

              {photoPreviews.length < 4 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-borderDark p-3 text-center text-text3 transition-all hover:border-accent hover:bg-accent/5 hover:text-accent">
                  <UploadCloud size={24} className="mb-2" />
                  <span className="font-mono text-xs font-black uppercase tracking-[0.12em]">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-lg border border-borderDark bg-bg p-4 md:flex-row md:items-start md:justify-end">
          <div className="w-full md:mr-auto md:max-w-md">
            <div className="rounded-lg border border-borderDark bg-surfaceStrong p-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-textDefault">
                <ShieldCheck size={16} className="text-primary" />
                Quick safety check
              </h3>
              <p className="mt-1 text-xs text-text3">One quick click helps block spam reports while keeping real reports easy to submit.</p>
              <TurnstileWidget
                onTokenChange={setTurnstileToken}
                onError={() => toast.error("Security check unavailable. Please refresh and try again.")}
                className="mt-3"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={clearFormDraft}
            disabled={isSubmitting || isUploadingPhotos}
            className="w-full rounded-md border border-borderDark bg-surfaceStrong px-4 py-2.5 font-bold text-text2 transition-colors hover:border-text3 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
          >
            Clear Form
          </button>
          <button type="submit" disabled={isSubmitting || isUploadingPhotos} className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent2 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto md:text-base">
            <CheckCircle size={16} />
            {isUploadingPhotos ? <span className="animate-pulse">Uploading images...</span> : isSubmitting ? <span className="animate-pulse">Submitting Report...</span> : "Submit Report"}
          </button>
        </div>

      </form>
    </div>
  );
}
