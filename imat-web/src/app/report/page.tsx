"use client";

import { useState, FormEvent, useEffect, ChangeEvent } from "react";
import { ArrowLeft, AlertTriangle, UploadCloud, X, MapPin } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { enqueueReportUpload, QueuedReportPayload } from "@/lib/reportUploadQueue";

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
  const [zones, setZones] = useState<Zone[]>([]);
  const [draft, setDraft] = useState<ReportDraft>(DEFAULT_DRAFT);
  const [locating, setLocating] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const category = draft.category;

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
    } catch (error) {
      console.error("Failed to restore report draft", error);
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
  }, []);

  const supportsBackgroundSync = () => {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window;
  };

  const registerAndScheduleBackgroundSync = async (): Promise<boolean> => {
    if (!supportsBackgroundSync()) return false;

    try {
      await navigator.serviceWorker.register("/upload-sync-sw.js");

      // Ensure a service worker is active before attempting Background Sync registration.
      const registration = await navigator.serviceWorker.ready;
      if (!("sync" in registration) || !registration.active) {
        return false;
      }

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

      registration.active.postMessage({ type: "PROCESS_UPLOAD_QUEUE" });

      return true;
    } catch (error) {
      console.error("Failed to register background sync", error);
      return false;
    }
  };

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
      (error) => {
        console.error(error);
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
      toast.error("Image upload is not configured yet.");
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
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const queueReportForBackgroundUpload = async (payload: QueuedReportPayload, photos: File[]) => {
    const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS;

    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
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
      config: {
        cloudinaryCloudName,
        cloudinaryUploadPreset,
      },
    });

    return await registerAndScheduleBackgroundSync();
  };

  const submitReportImmediately = async (payload: QueuedReportPayload, photos: File[]) => {
    const uploadedPhotoUrls = await uploadPhotos(photos);

    const response = await fetch("/api/public-report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        photos: uploadedPhotoUrls,
      }),
    });

    if (!response.ok) {
      const payloadText = await response.text().catch(() => "");
      throw new Error(payloadText || `Request failed with status ${response.status}`);
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
      title: formDataObj.get("title") as string,
      category: formDataObj.get("category") as string,
      defect_type: formDataObj.get("defect_type") as string,
      severity: Number.parseInt(formDataObj.get("severity") as string, 10),
      campus_zone_id: campusZone,
      affected_area_sqm: Number.isNaN(parsedArea as number) ? null : parsedArea,
      description: formDataObj.get("description") as string,
      location_lat: draft.location_lat,
      location_lng: draft.location_lng,
    };

    try {
      if (!navigator.onLine) {
        if (supportsBackgroundSync()) {
          const queued = await queueReportForBackgroundUpload(dataPayload, selectedPhotos);
          if (queued) {
            toast.success("Network is bad. Report saved and will upload automatically when connection improves.", { duration: 6500 });
            clearFormDraft();
          } else {
            toast.error("Unable to queue this report right now. Please try again when network is stable.");
          }
        } else {
          toast.error("Network is bad and this browser cannot queue uploads. Please upload when you have good network.");
        }

        return;
      }

      await submitReportImmediately(dataPayload, selectedPhotos);

      toast.success("Defect successfully reported! Thank you for your vigilance.", { duration: 6000 });
      clearFormDraft();
    } catch (error) {
      console.error(error);

      const isNetworkRelated =
        !navigator.onLine ||
        error instanceof TypeError ||
        (error instanceof Error && /network|fetch|failed/i.test(error.message));

      if (isNetworkRelated && supportsBackgroundSync()) {
        const queued = await queueReportForBackgroundUpload(dataPayload, selectedPhotos);
        if (queued) {
          toast.success("Network became unstable. Report saved and will upload automatically once network is good.", { duration: 6500 });
          clearFormDraft();
          return;
        }
      }

      if (isNetworkRelated) {
        toast.error("Network is bad. Please upload when you have good network.");
      } else {
        toast.error("Failed to submit the report. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-textDefault mb-4">Report an Issue</h1>
        <p className="text-base sm:text-lg md:text-xl text-text2 max-w-2xl mx-auto">
          Help maintain a safe and functioning campus. Found a defect? Log it here anonymously, and our Field Officers will assess it.
        </p>
      </div>

      <div className="bg-warningDim border-l-4 border-warning p-4 mb-8 rounded text-sm text-textDefault flex items-start gap-3">
        <AlertTriangle className="text-warning shrink-0" size={20} />
        <div>
          <strong className="block mb-1">In case of Emergency</strong>
          If this defect poses an immediate threat to life or property, please contact the Works Department directly alongside submitting this report.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-bg2 border border-borderDark rounded-xl p-6 md:p-10 space-y-8">
        
        {/* WHAT HAPPENED */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</div>
             <h2 className="text-xl font-bold text-textDefault">What did you find?</h2>
          </div>
          
          <div className="space-y-6 pl-0 sm:pl-11">
            <div>
              <label className="block font-bold text-textDefault mb-2">Short Title <span className="text-danger">*</span></label>
              <input name="title" type="text" maxLength={80} placeholder="e.g. Massive pothole near ETF building" required value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Category <span className="text-danger">*</span></label>
                <select name="category" value={category} onChange={e => setDraft((prev) => ({ ...prev, category: e.target.value }))} required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="drainage">Drainage</option>
                  <option value="road">Road</option>
                  <option value="walkway">Walkway</option>
                  <option value="structure">Structure (Building)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Type of Defect <span className="text-danger">*</span></label>
                <select name="defect_type" value={draft.defect_type} onChange={(e) => setDraft((prev) => ({ ...prev, defect_type: e.target.value }))} required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="">Select specific type...</option>
                  {DEFECT_TYPES[category]?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-textDefault mb-2">Severity Level <span className="text-danger">*</span></label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
                {[
                  { val: 1, label: "Cosmetic", desc: "Surface issues, no risk" },
                  { val: 2, label: "Minor", desc: "Limited function impact" },
                  { val: 3, label: "Moderate", desc: "Affects safety/usage" },
                  { val: 4, label: "Critical", desc: "Active hazard" },
                  { val: 5, label: "Emergency", desc: "Imminent danger" }
                ].map(sev => (
                  <label key={sev.val} className={`border border-borderDark rounded-lg p-3 cursor-pointer text-center hover:border-primary transition-colors flex flex-col items-center justify-center gap-1 ${sev.val >= 4 ? 'hover:bg-dangerDim' : 'hover:bg-primaryDim'}`}>
                    <input type="radio" name="severity" value={sev.val} checked={draft.severity === String(sev.val)} onChange={(e) => setDraft((prev) => ({ ...prev, severity: e.target.value }))} required className="w-4 h-4 cursor-pointer mb-2" />
                    <strong className={`block text-sm ${sev.val >= 4 ? 'text-danger' : 'text-textDefault'}`}>{sev.val}: {sev.label}</strong>
                    <span className="text-[10px] text-text3 leading-tight">{sev.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-borderDark" />

        {/* WHERE IS IT */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</div>
             <h2 className="text-xl font-bold text-textDefault">Where is it located?</h2>
          </div>

          <div className="space-y-6 pl-0 sm:pl-11">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Campus Zone</label>
                <select name="campus_zone_id" value={draft.campus_zone_id} onChange={(e) => setDraft((prev) => ({ ...prev, campus_zone_id: e.target.value }))} className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="">Select general zone (optional)...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Estimated Area (sq meters)</label>
                <input name="affected_area_sqm" value={draft.affected_area_sqm} onChange={(e) => setDraft((prev) => ({ ...prev, affected_area_sqm: e.target.value }))} type="number" step="0.1" placeholder="e.g. 5" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-textDefault mb-2">Precise Location (GPS Coordinates)</label>
              <button
                type="button"
                onClick={getLocation}
                disabled={locating}
                className="w-full p-3 flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <MapPin size={16} />
                {locating
                  ? "Capturing location..."
                  : draft.location_lat !== null && draft.location_lng !== null
                    ? `LAT ${draft.location_lat.toFixed(5)} / LNG ${draft.location_lng.toFixed(5)}`
                    : "Capture Current GPS Coordinates (Optional)"}
              </button>
              <p className="mt-2 text-xs text-text3">Optional, but helpful for faster field verification.</p>
            </div>
            
            <div>
              <label className="block font-bold text-textDefault mb-2">Detailed Description & Exact Location <span className="text-danger">*</span></label>
              <textarea name="description" value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Describe the defect and exactly where it is so field officers can easily find it..." required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault"></textarea>
            </div>
          </div>
        </section>

        <hr className="border-borderDark" />

        {/* PHOTO UPLOAD */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">3</div>
             <h2 className="text-xl font-bold text-textDefault">Photographic Evidence</h2>
          </div>
          
          <div className="pl-0 sm:pl-11">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photoPreviews.map((preview, idx) => (
                  <div key={preview} className="relative aspect-square rounded-lg border border-borderDark overflow-hidden bg-bg">
                    <Image src={preview} alt={`Selected evidence ${idx + 1}`} fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full hover:bg-danger transition-colors"
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {photoPreviews.length < 4 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-borderDark hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center cursor-pointer text-text3 hover:text-primary p-3 text-center">
                    <UploadCloud size={24} className="mb-2" />
                    <span className="text-xs font-mono uppercase">Upload Photo</span>
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

              <p className="text-xs text-text3">Optional. You can upload up to 4 images (JPG, PNG, WebP).</p>
            </div>
          </div>
        </section>

        <div className="pt-8 flex flex-col-reverse md:flex-row md:justify-end gap-3">
          <button
            type="button"
            onClick={clearFormDraft}
            disabled={isSubmitting || isUploadingPhotos}
            className="w-full md:w-auto px-6 py-3 bg-bg border border-borderDark hover:border-text3 text-text2 font-semibold rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Clear Form
          </button>
          <button type="submit" disabled={isSubmitting || isUploadingPhotos} className="w-full md:w-auto px-10 py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg text-lg transition-transform hover:-translate-y-1 shadow-xl flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed">
            {isUploadingPhotos ? <span className="animate-pulse">Uploading images...</span> : isSubmitting ? <span className="animate-pulse">Submitting Report...</span> : "Submit Public Report"}
          </button>
        </div>

      </form>
    </div>
  );
}
