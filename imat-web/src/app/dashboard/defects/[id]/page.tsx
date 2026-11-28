"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Clock, MapPin, AlertTriangle, FileText, CheckCircle, Camera, Activity, ArrowUpCircle, Wrench } from "lucide-react";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import { formatDistanceToNow } from "date-fns";
import { toast } from "react-hot-toast";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { useParams } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type DetailedDefect = {
  id: string;
  title: string;
  description: string;
  category: string;
  defect_type: string;
  severity: number;
  affected_area_sqm: number | null;
  status: string;
  created_at: string;
  photos: string[];
  location_lat: number | null;
  location_lng: number | null;
  campus_zones: { name: string } | null;
  assignee: { full_name: string, role: string } | null;
  reporter: { full_name: string } | null;
};

export default function DefectDetailsPage() {
  const params = useParams<{ id: string }>();
  const defectId = params.id;
  const [defect, setDefect] = useState<DetailedDefect | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<Array<{ id: string; title: string; description: string; before_image_url: string; after_image_url: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchDefectDetails = async () => {
      if (!defectId) {
        setLoading(false);
        return;
      }

      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("defects")
        .select(`
          *,
          campus_zones(name),
          assignee:users!defects_assigned_to_fkey(full_name, role),
          reporter:users!defects_reported_by_fkey(full_name)
        `)
        .eq("id", defectId)
        .single();

      if (data && !error) {
        setDefect(data as unknown as DetailedDefect);
        const { data: evidence } = await supabase
          .from("evidence_gallery")
          .select("id, title, description, before_image_url, after_image_url")
          .eq("defect_id", defectId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        setLinkedEvidence((evidence ?? []) as Array<{ id: string; title: string; description: string; before_image_url: string; after_image_url: string | null }>);
      } else {
        console.error("Defect details load failed.");
      }
      setLoading(false);
    };

    fetchDefectDetails();
  }, [defectId]);

  if (loading) {
    return <div className="p-12 text-center text-text3 font-mono">Decrypting structural data logs...</div>;
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!defect) return;
    setUpdating(true);
    const supabase = createSupabaseClient();
    const previousStatus = defect.status;
    
    // Check if transition is valid or required
    if (defect.status === newStatus) {
       toast("Defect is already in this state.");
       setUpdating(false);
       return;
    }

    const { error } = await supabase
       .from("defects")
       .update({ status: newStatus })
       .eq("id", defect.id);

    if (error) {
       console.error("Error updating status.");
       toast.error("Failed to update status. Check logs.");
    } else {
       const { data: { session } } = await supabase.auth.getSession();
       if (session?.user?.id) {
         await logActivityEvent(supabase, {
           eventType: "defect_status_updated",
           entityType: "defect",
           entityId: defect.id,
           title: `Updated defect ${defect.id} status to ${newStatus}`,
           actorId: session.user.id,
           details: {
             oldStatus: previousStatus,
             newStatus,
           },
           isRelevant: true,
         });
       }

       setDefect({ ...defect, status: newStatus });
       toast.success(`Defect updated to ${newStatus.replace(/_/g, ' ')}!`);
    }
    setUpdating(false);
  };

  if (!defect) {
    return <div className="p-12 text-center text-danger font-mono border border-danger/20 bg-danger/5 rounded-xl">ERROR: Defect record not found in database.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <Breadcrumbs className="mb-8" />
      
      <div className="bg-bg2 border border-soft rounded-xl overflow-hidden shadow-2xl">
         
         {/* HEADER */}
         <div className="p-4 sm:p-8 border-b border-soft">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <span className="px-2 py-1 uppercase tracking-wider text-[10px] font-bold bg-bg3 text-text2 rounded border border-soft">
                      {defect.id}
                   </span>
                   <span className="px-2 py-1 uppercase tracking-wider text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded border border-blue-500/20">
                      {defect.status.replace(/_/g, ' ')}
                   </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-textDefault capitalize">{defect.title}</h1>
                <div className="flex items-center gap-2 mt-2 text-text3 text-xs font-mono">
                  <Clock size={12} /> Reported {formatDistanceToNow(new Date(defect.created_at), { addSuffix: true })}
                </div>
              </div>

              <div className="flex flex-col items-start text-left md:items-end md:text-right shrink-0">
                 <div className="text-[10px] text-text3 font-mono uppercase tracking-wider mb-1">Structural Severity</div>
                 {defect.severity === 5 ? <span className="bg-danger/20 text-danger border border-danger/30 px-3 py-1.5 rounded font-bold font-mono text-sm shadow-[0_0_15px_rgba(239,68,68,0.2)]">LVL 5 EMERGENCY</span> :
                  defect.severity === 4 ? <span className="bg-warning/20 text-warning border border-warning/30 px-3 py-1.5 rounded font-bold font-mono text-sm">LVL 4 CRITICAL</span> :
                  <span className="bg-bg3 text-text2 border border-soft px-3 py-1.5 rounded font-bold font-mono text-sm">LEVEL {defect.severity}</span>}
              </div>
            </div>
         </div>

         {/* MAIN CONTENT GRID */}
         <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Metadata & Map */}
            <div className="col-span-1 space-y-6">
               <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1">Geospatial Data</h3>
                  <div className="bg-bg rounded-lg border border-soft p-4 space-y-3">
                    <div className="flex items-start gap-2">
                       <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                       <div>
                         <div className="font-bold text-sm text-textDefault">{defect.campus_zones?.name || "Unmapped Zone"}</div>
                         <div className="text-xs text-text2 capitalize">{defect.category} &gt; {defect.defect_type}</div>
                       </div>
                    </div>
                    {defect.location_lat && defect.location_lng && (
                      <div className="pt-3 border-t border-soft">
                        <div className="text-xs text-text3 font-mono mb-2">VECTOR: {defect.location_lat}, {defect.location_lng}</div>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${defect.location_lat},${defect.location_lng}`}
                          target="_blank" rel="noreferrer"
                          className="block text-center text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors py-2 rounded font-bold"
                        >
                          Launch in Maps
                        </a>
                      </div>
                    )}
                  </div>
               </div>

               <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1">Personnel Info</h3>
                  <div className="bg-bg rounded-lg border border-soft p-4 space-y-4">
                     <div>
                       <div className="text-[10px] text-text3 uppercase tracking-wider mb-1">Assigned Supervising Officer</div>
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30">
                           {defect.assignee?.full_name ? defect.assignee.full_name.charAt(0) : "?"}
                         </div>
                         <div className="text-sm font-semibold text-textDefault">
                           {defect.assignee?.full_name || "Unassigned"}
                         </div>
                       </div>
                     </div>
                  </div>
               </div>

               {defect.affected_area_sqm && (
                 <div>
                   <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1">Measurements</h3>
                   <div className="text-xl font-bold font-mono text-textDefault">{defect.affected_area_sqm} <span className="text-text3 text-sm">m²</span></div>
                 </div>
               )}
            </div>

            {/* RIGHT COLUMN: Notes & Photos */}
            <div className="col-span-1 md:col-span-2 space-y-8">
               
               <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1 flex items-center gap-2">
                    <FileText size={14} /> Official Engineering Notes
                  </h3>
                  <div className="bg-bg border border-soft rounded-lg p-5">
                     <p className="text-text2 text-sm leading-relaxed whitespace-pre-wrap">
                       {defect.description}
                     </p>
                  </div>
               </div>

               <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1 flex items-center gap-2">
                    <Camera size={14} /> Photographic Evidence
                  </h3>
                  
                  {defect.photos && defect.photos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {defect.photos.map((url, i) => (
                        <div key={i} className="relative aspect-video rounded-lg border border-soft overflow-hidden bg-black group">
                          <Image src={url && url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(url) : url} alt={`Evidence ${i+1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white/70 font-mono">IMG_STRUCTURAL_{i+1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-text3 italic p-8 text-center bg-bg rounded-lg border border-dashed border-soft">
                      No photographic evidence attached to this database record.
                    </div>
                  )}
               </div>

               {linkedEvidence.length > 0 && (
                 <div>
                   <h3 className="text-xs font-mono uppercase tracking-wider text-text3 mb-3 border-b border-soft pb-1 flex items-center gap-2">
                     <Camera size={14} /> Linked Repair Evidence
                   </h3>
                   <div className="space-y-4">
                     {linkedEvidence.map((item) => (
                       <div key={item.id} className="rounded-lg border border-soft bg-bg p-4">
                         <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                           <h4 className="text-sm font-bold text-textDefault">{item.title}</h4>
                           <a href="/evidence" className="text-xs font-semibold text-accent hover:text-accent2">
                             View in the evidence gallery →
                           </a>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           <div>
                             <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-text3">Before</span>
                             <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-soft bg-black">
                               <Image src={item.before_image_url && item.before_image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(item.before_image_url) : item.before_image_url} alt={`${item.title} before`} fill className="object-cover" />
                             </div>
                           </div>
                           <div>
                             <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-wider text-text3">After</span>
                             {item.after_image_url ? (
                               <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-soft bg-black">
                                 <Image src={item.after_image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(item.after_image_url) : item.after_image_url} alt={`${item.title} after`} fill className="object-cover" />
                               </div>
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

            </div>
         </div>
         
         {/* FOOTER ACTIONS */}
         <div className="p-6 bg-bg border-t border-soft flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="text-xs text-text3 font-mono flex items-center gap-2">
             <AlertTriangle size={14} className="text-warning"/>
             This structural data is confidential FUTA infrastructure data.
           </div>
           
           <div className="flex flex-wrap gap-3">
             <button 
               onClick={() => handleUpdateStatus('assessed')}
               disabled={updating || defect.status === 'assessed'}
               className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 hover:border-blue-400 hover:text-blue-400 text-blue-500 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Activity size={16}/> Under Assessment
             </button>
             <button 
               onClick={() => handleUpdateStatus('escalated')}
               disabled={updating || defect.status === 'escalated'}
               className="px-4 py-2 bg-danger/10 border border-danger/20 hover:border-danger hover:text-danger text-danger text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <ArrowUpCircle size={16}/> Escalate
             </button>
             <button 
               onClick={() => handleUpdateStatus('acknowledged_by_works')}
               disabled={updating || defect.status === 'acknowledged_by_works'}
               className="px-4 py-2 bg-accent/10 border border-accent/20 hover:border-accent hover:text-accent text-accent text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Wrench size={16}/> Acknowledge
             </button>
             <button 
               onClick={() => handleUpdateStatus('resolved')}
               disabled={updating || defect.status === 'resolved'}
               className="px-4 py-2 bg-success/10 border border-success/20 hover:border-success hover:text-success text-success text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <CheckCircle size={16}/> Mark Resolved
             </button>
           </div>
         </div>
      </div>
    </div>
  );
}
