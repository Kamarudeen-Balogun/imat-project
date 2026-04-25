"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { toast } from "react-hot-toast";
import { UploadCloud, MapPin, X } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import Image from "next/image";
import { sanitizePlainText, sanitizeNumericText } from "@/lib/inputSanitizer";

type Zone = { id: string; name: string };

const CATEGORIES = ["drainage", "road", "walkway", "structure", "other"];
const DEFECT_TYPES: Record<string, string[]> = {
  drainage: ["Blocked Grate", "Damaged Interlocking", "Overgrown Culvert", "Collapsed Drain"],
  road: ["Pothole", "Cracked Surface", "Edge Failure", "Asphalt Bleeding"],
  walkway: ["Eroded Corridor", "Cracked Concrete", "Uneven Pavers", "Waterlogged Path"],
  structure: ["Wall Crack", "Roof Leak", "Exposed Rebar", "Foundation Settlement"],
  other: ["Unspecified"]
};

export default function NewAssessmentPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("drainage");
  const [defectType, setDefectType] = useState(DEFECT_TYPES["drainage"][0]);
  const [severity, setSeverity] = useState("3");
  const [affectedArea, setAffectedArea] = useState("");
  const [campusZoneId, setCampusZoneId] = useState("");
  
  // Geolocation state
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locating, setLocating] = useState(false);
  
  // Database data
  const [zones, setZones] = useState<Zone[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Photos State
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);

      const { data: zData } = await supabase.from("campus_zones").select("id, name");
      if (zData && zData.length > 0) {
        setZones(zData);
        setCampusZoneId(zData[0].id);
      }
    }
    init();
  }, [supabase]);

  // Effect to update defect types when category changes
  useEffect(() => {
    setDefectType(DEFECT_TYPES[category][0]);
  }, [category]);

  const getLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocating(false);
          toast.success("GPS Coordinate captured!");
        },
        () => {
          console.error("Location capture failed.");
          toast.error("Failed to get location. Please enable GPS permissions.");
          setLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
      setLocating(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedPhotos.length + filesArray.length > 4) {
        toast.error("Maximum 4 photos allowed per assessment.");
        return;
      }
      
      const newPreviews = filesArray.map(f => URL.createObjectURL(f));
      
      setSelectedPhotos(prev => [...prev, ...filesArray]);
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload to Cloudinary
  const uploadPhotos = async (): Promise<string[]> => {
    if (selectedPhotos.length === 0) return [];
    setUploadingPhotos(true);
    
    const uploadedUrls: string[] = [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary mapping missing! Using local placeholders.");
      setUploadingPhotos(false);
      return [];
    }

    try {
      for (const file of selectedPhotos) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        
        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        uploadedUrls.push(data.secure_url);
      }
      setUploadingPhotos(false);
      return uploadedUrls;
    } catch {
      console.error("Defect photo upload failed.");
      toast.error("Failed to upload structural evidence photos.");
      setUploadingPhotos(false);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Authentication required.");
      return;
    }

    const safeTitle = sanitizePlainText(title, 120);
    const safeDescription = sanitizePlainText(description, 4000);
    const safeCategory = sanitizePlainText(category, 20);
    const safeDefectType = sanitizePlainText(defectType, 120);
    const safeAffectedArea = sanitizeNumericText(affectedArea, 16);
    
    setLoading(true);
    
    try {
      const photosArray = await uploadPhotos();

      // Insert Defect Record
      const { data: defect, error: defectError } = await supabase
        .from("defects")
        .insert({
          title: safeTitle,
          description: safeDescription,
          category: safeCategory,
          defect_type: safeDefectType,
          severity: parseInt(severity),
          affected_area_sqm: safeAffectedArea ? parseFloat(safeAffectedArea) : null,
          campus_zone_id: campusZoneId,
          location_lat: location?.lat || null,
          location_lng: location?.lng || null,
          reported_by: userId,
          assigned_to: userId, // Auto-assign to the reporting field officer for now
          photos: photosArray
        })
        .select("id")
        .single();

      if (defectError) throw defectError;

      // Log the specific field assessment details linked to this defect
      const { error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          defect_id: defect.id,
          officer_id: userId,
          field_notes: safeDescription,
          measurement_data: { affected_area: safeAffectedArea },
          photos: photosArray
        });

      if (assessmentError) throw assessmentError;

      await logActivityEvent(supabase, {
        eventType: "defect_created",
        entityType: "defect",
        entityId: defect.id,
        title: `Created defect ${defect.id}: ${safeTitle}`,
        actorId: userId,
        details: {
          category: safeCategory,
          defectType: safeDefectType,
          severity: parseInt(severity),
          campusZoneId,
        },
        isRelevant: true,
      });

      toast.success("Field assessment logged successfully!");
      router.push("/dashboard");
    } catch {
      console.error("Defect submission failed.");
      toast.error("Failed to log assessment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textDefault flex items-center gap-3">
          <MapPin className="text-primary"/> New Field Assessment
        </h1>
        <p className="text-text2 mt-2">
          Strictly for authorized IMAT Field and Technical Officers. Ensure measurements are exact and photos clearly document the structural failure mechanism.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-bg2 border border-soft rounded-xl p-6 md:p-10 shadow-xl">
        
        {/* Core Details */}
        <section className="space-y-6 border-b border-soft pb-8">
          <div>
            <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Defect General Title</label>
            <input 
              required
              type="text" 
              maxLength={100}
              placeholder="e.g. Total collapse of perimeter drainage wall"
              className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Campus Zone</label>
              <select 
                required
                className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault transition-colors appearance-none"
                value={campusZoneId}
                onChange={e => setCampusZoneId(e.target.value)}
              >
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            
            <div>
               <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Precise Location (GPS)</label>
               <button 
                type="button"
                onClick={getLocation}
                disabled={locating}
                className="w-full p-4 flex items-center justify-center gap-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg font-bold transition-colors"
               >
                 {locating ? "Acquiring SAT lock..." : location ? `LAT: ${location.lat.toFixed(5)} / LNG: ${location.lng.toFixed(5)}` : "Capture Current GPS Coordinates"}
               </button>
            </div>
          </div>
        </section>

        {/* Technical Data */}
        <section className="space-y-6 border-b border-soft pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Category</label>
              <select 
                className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault transition-colors appearance-none"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Specific Type</label>
              <select 
                className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault transition-colors appearance-none"
                value={defectType}
                onChange={e => setDefectType(e.target.value)}
              >
                {DEFECT_TYPES[category].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Affected Area (m²)</label>
              <input 
                type="number" 
                step="0.1"
                min="0"
                placeholder="e.g. 15.5"
                className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors"
                value={affectedArea}
                onChange={e => setAffectedArea(e.target.value)}
              />
            </div>
          </div>

          <div>
             <label className="block border-l-4 border-warning pl-3 font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">
                Structural Severity Level (1-5)
             </label>
             <input 
                type="range" 
                min="1" max="5" 
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                className="w-full h-2 bg-borderDark rounded-lg appearance-none cursor-pointer accent-warning" 
             />
             <div className="flex justify-between text-xs text-text3 font-mono mt-2 px-1">
               <span>1 (Minor)</span>
               <span>2</span>
               <span className="font-bold text-warning border-b border-warning">Current: {severity}</span>
               <span>4</span>
               <span className="text-danger">5 (Emergency)</span>
             </div>
          </div>

          <div>
            <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Engineering Field Notes & Recommendations</label>
            <textarea 
              required
              rows={4}
              placeholder="Provide a detailed engineering observation. Mention surrounding environmental factors, visible stresses, and proposed mitigation..."
              className="w-full p-4 bg-bg border border-soft rounded-lg focus:border-primary focus:outline-none text-textDefault placeholder-text3 transition-colors resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
            ></textarea>
          </div>
        </section>

        {/* Evidence Upload */}
        <section className="space-y-6">
           <div>
              <label className="block font-bold text-textDefault mb-2 uppercase tracking-wide font-mono text-xs">Photographic Evidence (Max 4)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {photoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg border border-soft overflow-hidden bg-bg">
                      <Image src={preview} alt="Upload preview" fill className="object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-danger transition-colors backdrop-blur-sm"
                      >
                        <X size={14} />
                      </button>
                    </div>
                 ))}
                 
                 {photoPreviews.length < 4 && (
                   <label className="aspect-square rounded-lg border-2 border-dashed border-soft hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center cursor-pointer text-text3 hover:text-primary">
                     <UploadCloud size={24} className="mb-2" />
                     <span className="text-xs font-mono uppercase">Upload Photo</span>
                     <input type="file" accept="image/jpeg, image/png, image/webp" multiple onChange={handlePhotoSelect} className="hidden" />
                   </label>
                 )}
              </div>
           </div>
        </section>

        <div className="pt-6">
          <button 
            type="submit" 
            disabled={loading || uploadingPhotos} 
            className="w-full py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {(loading || uploadingPhotos) ? (
               <span className="animate-pulse">{uploadingPhotos ? "Encrypting Visual Evidence..." : "Saving Assessment Sequence..."}</span>
            ) : "Submit Field Assessment"}
          </button>
        </div>

      </form>
    </div>
  );
}

