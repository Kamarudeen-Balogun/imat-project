"use client";

import { useState, FormEvent, useEffect } from "react";
import { ArrowLeft, AlertTriangle, UploadCloud } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

type Zone = { id: string; name: string };

export default function ReportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [category, setCategory] = useState("road");

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formDataObj = new FormData(form);

    const dataPayload = {
      title: formDataObj.get("title") as string,
      category: formDataObj.get("category") as string,
      defect_type: formDataObj.get("defect_type") as string,
      severity: parseInt(formDataObj.get("severity") as string),
      campus_zone_id: formDataObj.get("campus_zone_id") as string,
      affected_area_sqm: parseFloat(formDataObj.get("affected_area_sqm") as string) || null,
      description: formDataObj.get("description") as string,
    };

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.from("defects").insert([dataPayload]);
      
      if (error) throw error;

      toast.success("Defect successfully reported! Thank you for your vigilance.", { duration: 6000 });
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const defectTypes: Record<string, string[]> = {
    road: ["Pothole", "Edge Bleeding", "Surface Cracking", "Washed Out", "Other"],
    walkway: ["Cracked Concrete", "Broken Interlock", "Uneven Surface", "Muddy Pooling", "Other"],
    drainage: ["Blocked/Silted", "Broken Slab", "Collapsed Wall", "Overgrown Vegetation", "Other"],
    structure: ["Wall Crack", "Roof Leak", "Broken Window", "Plumbing Leak", "Other"],
    other: ["Vegetation Overgrowth", "Electrical Hazard", "Signage Broken", "Other"]
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
              <input name="title" type="text" maxLength={80} placeholder="e.g. Massive pothole near ETF building" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Category <span className="text-danger">*</span></label>
                <select name="category" value={category} onChange={e => setCategory(e.target.value)} required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="drainage">Drainage</option>
                  <option value="road">Road</option>
                  <option value="walkway">Walkway</option>
                  <option value="structure">Structure (Building)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Type of Defect <span className="text-danger">*</span></label>
                <select name="defect_type" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="">Select specific type...</option>
                  {defectTypes[category]?.map(type => (
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
                    <input type="radio" name="severity" value={sev.val} required className="w-4 h-4 cursor-pointer mb-2" />
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
                <select name="campus_zone_id" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault">
                  <option value="">Select general zone (optional)...</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Estimated Area (sq meters)</label>
                <input name="affected_area_sqm" type="number" step="0.1" placeholder="e.g. 5" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
            </div>
            
            <div>
              <label className="block font-bold text-textDefault mb-2">Detailed Description & Exact Location <span className="text-danger">*</span></label>
              <textarea name="description" rows={4} placeholder="Describe the defect and exactly where it is so field officers can easily find it..." required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault"></textarea>
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
             <div className="border border-borderDark border-dashed rounded-xl p-8 text-center bg-bg flex flex-col items-center justify-center">
               <UploadCloud className="text-text3 mb-4" size={32} />
               <h3 className="font-bold text-textDefault mb-2">Upload Photo (Optional)</h3>
               <p className="text-text2 text-sm mb-4">Cloudinary integration coming in Phase 4.</p>
               <button type="button" className="px-4 py-2 border border-borderLit text-xs rounded text-text3 cursor-not-allowed">Select Image...</button>
             </div>
          </div>
        </section>

        <div className="pt-8 flex justify-end">
          <button type="submit" disabled={isSubmitting} className="w-full md:w-auto px-10 py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg text-lg transition-transform hover:-translate-y-1 shadow-xl flex items-center justify-center">
            {isSubmitting ? <span className="animate-pulse">Submitting Report...</span> : "Submit Public Report"}
          </button>
        </div>

      </form>
    </div>
  );
}
