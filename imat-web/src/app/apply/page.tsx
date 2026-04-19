"use client";

import { useState, FormEvent } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzeIK6drlHbG278eWTXNKdBKtRcJxGsJdMj6aqeeTVfhDLRNAwCabqNAioZloYW4DrEuQ/exec";

export default function ApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // States to handle dynamic visibility and logic
  const [selectedLevel, setSelectedLevel] = useState("");
  const [hasLeadership, setHasLeadership] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formDataObj = new FormData(form);

    // Helpers
    const getVal = (name: string) => (formDataObj.get(name) as string) || "";
    const getMultiple = (name: string) => formDataObj.getAll(name).map(v => v.toString());

    const dataPayload = {
      fullName: getVal("fullName"),
      matricNumber: getVal("matricNumber"),
      gender: getVal("gender"),
      level: getVal("level"),
      email: getVal("email"),
      phone: getVal("phone"),
      address: getVal("address"),
      cgpa: getVal("cgpa"),
      graduationYear: getVal("graduationYear"),
      leadership: getVal("leadership"),
      leadershipDetail: getVal("leadershipDetailsText"),
      workingGroups: getMultiple("workingGroups"),
      positions: getMultiple("positions"),
      skills: getMultiple("skills"),
      otherSkills: getVal("otherSkills"),
      motivation: getVal("motivation"),
      timeCommitment: getVal("timeCommitment"),
      refereeName: getVal("refereeName"),
      refereeDept: getVal("refereeDept"),
      refereeEmail: getVal("refereeEmail"),
      refereePhone: getVal("refereePhone"),
      agreement: getVal("agreement") === "on" ? "Yes, I agree" : "",
      signature: getVal("signature"),
      signatureDate: getVal("signatureDate") || today
    };

    try {
      // 1. Submit to Google Apps Script
      fetch(WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain"
        },
        body: JSON.stringify(dataPayload)
      }).catch(err => {
        console.error("GAS Error:", err);
      }); // fire and forget for no-cors

      // 2. Also save core data to our Supabase table just in case!
      const supabase = createSupabaseClient();
      await supabase.from("applications").insert([{
        full_name: dataPayload.fullName,
        matric_number: dataPayload.matricNumber,
        email: dataPayload.email,
        phone: dataPayload.phone,
        department: "Civil Engineering", // Pre-assumed based on eligibility
        level: parseInt(dataPayload.level) || 0,
        cgpa: dataPayload.cgpa === "Yes" ? 3.5 : 2.5, // approximate mapping for db
        preferred_role1: dataPayload.positions.length > 0 ? dataPayload.positions[0] : "",
        preferred_role2: dataPayload.positions.length > 1 ? dataPayload.positions[1] : "",
        motivation_statement: dataPayload.motivation,
        status: "pending"
      }]);

      setSubmitSuccess(true);
      toast.success("Application successfully submitted!");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong saving your application. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
        <CheckCircle2 size={64} className="text-success mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-textDefault mb-4">Application Submitted!</h1>
        <p className="text-text2 mb-8">
          Thank you for applying to join IMAT-FUTA. Your responses have been recorded and sent successfully!
        </p>
        <Link href="/" className="px-8 py-4 bg-primary text-white font-bold rounded-lg hover:bg-blue-500 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-textDefault mb-4 uppercase">Membership Registration</h1>
        <p className="text-lg sm:text-xl text-primary font-bold mb-2">Infrastructure Maintenance Awareness Team (IMAT-FUTA)</p>
        <p className="text-text3 italic">&quot;Building a Culture of Care for Campus Infrastructure&quot;</p>
      </div>

      <div className="bg-warningDim border-l-4 border-warning p-4 mb-8 rounded text-sm text-textDefault">
        <strong>INSTRUCTIONS:</strong> Please fill out this form completely. All fields marked with <span className="text-danger">*</span> are mandatory.
      </div>

      <form onSubmit={handleSubmit} className="bg-bg2 border border-borderDark rounded-xl overflow-hidden p-6 md:p-10 space-y-12">
        
        {/* SECTION A */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section A: Personal Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-textDefault mb-2">Full Name (Surname First) <span className="text-danger">*</span></label>
              <input name="fullName" type="text" placeholder="e.g., ADEYEMI John Oluwaseun" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Matriculation Number <span className="text-danger">*</span></label>
                <input name="matricNumber" type="text" placeholder="e.g., CVE/20/5001" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Gender <span className="text-danger">*</span></label>
                <div className="flex gap-6 mt-3 text-textDefault">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="gender" value="Male" required className="w-4 h-4 cursor-pointer" /> Male</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="gender" value="Female" required className="w-4 h-4 cursor-pointer" /> Female</label>
                </div>
              </div>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Current Level <span className="text-danger">*</span></label>
              <div className="flex flex-wrap gap-6 mt-3 text-textDefault">
                {["200L", "300L", "400L", "500L"].map(lvl => (
                  <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="level" value={lvl} required className="w-4 h-4 cursor-pointer" onChange={(e) => setSelectedLevel(e.target.value)} /> {lvl}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Email Address <span className="text-danger">*</span></label>
                <input name="email" type="email" placeholder="youremail@gmail.com" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Phone Number <span className="text-danger">*</span></label>
                <input name="phone" type="tel" maxLength={11} pattern="\d{11}" placeholder="08000000000" title="Must be exactly 11 digits" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
                <span className="text-xs text-text3 mt-1 block">Must be exactly 11 digits</span>
              </div>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Residential Address on Campus</label>
              <input name="address" type="text" placeholder="e.g., Block A, Room 12, Jaja Hall" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
          </div>
        </section>

        {/* SECTION B */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section B: Academic Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-textDefault mb-2">Is your CGPA above 3.00? <span className="text-danger">*</span></label>
              <div className="flex gap-6 mt-3 text-textDefault">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cgpa" value="Yes" required className="w-4 h-4 cursor-pointer" /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cgpa" value="No" required className="w-4 h-4 cursor-pointer" /> No</label>
              </div>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Expected Year of Graduation</label>
              <input name="graduationYear" type="text" placeholder="e.g., 2026" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Any Previous Leadership Experience?</label>
              <div className="flex gap-6 mt-3 text-textDefault">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="leadership" value="Yes" onChange={e => setHasLeadership(e.target.value)} className="w-4 h-4 cursor-pointer" /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="leadership" value="No" onChange={e => setHasLeadership(e.target.value)} className="w-4 h-4 cursor-pointer" /> No</label>
              </div>
            </div>
            {hasLeadership === "Yes" && (
              <div>
                <label className="block font-bold text-textDefault mb-2">If YES, please provide details:</label>
                <textarea name="leadershipDetailsText" rows={3} placeholder="Describe your previous leadership roles..." className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault"></textarea>
              </div>
            )}
          </div>
        </section>

        {/* SECTION C */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section C: Areas of Interest & Skills</h2>
          <div className="space-y-8">
            <div>
              <label className="block font-bold text-primary mb-4 text-lg">Working Group(s) of Interest (check all that apply)</label>
              <div className="flex flex-col gap-3 text-textDefault">
                {["Assessment and Documentation Team", "Advocacy and Awareness Team", "Research and Technical Team", "Media and Communications Team"].map(group => (
                  <label key={group} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="workingGroups" value={group} className="w-5 h-5 cursor-pointer" /> {group}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-primary mb-4 text-lg">Position(s) of Interest (check all that apply)</label>
              <div className="flex flex-col gap-3 text-textDefault">
                <div className="flex items-center flex-wrap gap-3">
                  <label className={`flex items-center gap-3 ${selectedLevel && selectedLevel !== "500L" ? "opacity-50 line-through" : "cursor-pointer"}`}>
                    <input type="checkbox" name="positions" value="Team Coordinator" disabled={selectedLevel && selectedLevel !== "500L" ? true : false} className="w-5 h-5 cursor-pointer" /> 
                    Team Coordinator
                  </label>
                  <span className="text-[10px] bg-warningDim text-warning px-2 py-0.5 rounded-full font-bold">500L Only</span>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                  <label className={`flex items-center gap-3 ${selectedLevel && selectedLevel !== "400L" ? "opacity-50 line-through" : "cursor-pointer"}`}>
                    <input type="checkbox" name="positions" value="Assistant Coordinator" disabled={selectedLevel && selectedLevel !== "400L" ? true : false} className="w-5 h-5 cursor-pointer" /> 
                    Assistant Coordinator
                  </label>
                  <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold">400L Only</span>
                </div>
                
                {["Secretary", "Financial Secretary", "Director of Assessments", "Director of Advocacy & Public Relations", "HSE Officer", "General Member"].map(pos => (
                  <label key={pos} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="positions" value={pos} className="w-5 h-5 cursor-pointer" /> {pos}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-primary mb-4 text-lg">Relevant Skills/Experience (check all that apply)</label>
              <div className="flex flex-col gap-3 text-textDefault">
                {["Technical drawing/CAD", "Report writing", "Photography/Videography", "Social media management", "Graphic design", "Public speaking", "Data analysis", "First Aid/HSE training"].map(skill => (
                  <label key={skill} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="skills" value={skill} className="w-5 h-5 cursor-pointer" /> {skill}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-textDefault mb-2">Other Skills (Please specify)</label>
              <input name="otherSkills" type="text" placeholder="e.g., Project management, Event planning, etc." className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
          </div>
        </section>

        {/* SECTION D */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section D: Motivation & Commitment</h2>
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-textDefault mb-2">Why do you want to join IMAT? <span className="text-danger">*</span></label>
              <textarea name="motivation" rows={4} placeholder="Explain your motivation for joining IMAT..." required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault"></textarea>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">How much time can you commit per week? <span className="text-danger">*</span></label>
              <div className="flex flex-col gap-3 mt-3 text-textDefault">
                {["2-4 hours per week", "5-7 hours per week", "8-10 hours per week", "More than 10 hours per week"].map(time => (
                  <label key={time} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="timeCommitment" value={time} required className="w-4 h-4 cursor-pointer" /> {time}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION E */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section E: References</h2>
          <p className="italic text-text2 mb-6">Provide ONE academic reference (Lecturer / Course Advisor):</p>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Name of Referee</label>
                <input name="refereeName" type="text" placeholder="e.g., Dr. John Smith" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Department</label>
                <input name="refereeDept" type="text" placeholder="e.g., Civil Engineering" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Referee Email</label>
                <input name="refereeEmail" type="email" placeholder="referee.email@futa.edu.ng" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Referee Phone</label>
                <input name="refereePhone" type="tel" maxLength={11} pattern="\d{11}" placeholder="08000000000" title="Must be exactly 11 digits" className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION F */}
        <section>
          <h2 className="bg-primary text-bg p-3 text-lg font-bold rounded uppercase tracking-wide mb-6">Section F: Declaration</h2>
          <div className="bg-bg border border-borderDark p-6 rounded-lg mb-6">
             <p className="font-bold text-textDefault mb-4">I hereby declare that:</p>
             <ul className="list-disc pl-5 space-y-2 text-textDefault">
                <li>All information provided in this form is accurate and complete.</li>
                <li>I understand that IMAT operates strictly as an advocacy team, not an Aluta group.</li>
                <li>I commit to maintaining professional conduct and academic excellence.</li>
                <li>I am willing to undergo mandatory HSE training before active participation.</li>
                <li>I understand that membership may be revoked for academic misconduct or unprofessional behaviour.</li>
                <li>I agree to dedicate time to team activities without compromising my academic performance.</li>
             </ul>
          </div>
          <div className="mb-6">
             <label className="flex items-center gap-3 cursor-pointer text-textDefault font-bold">
               <input name="agreement" type="checkbox" required className="w-5 h-5 cursor-pointer" />
               I agree to all the declarations above <span className="text-danger">*</span>
             </label>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block font-bold text-textDefault mb-2">Applicant&apos;s Full Name (as signature) <span className="text-danger">*</span></label>
              <input name="signature" type="text" placeholder="Type your full name" required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Date <span className="text-danger">*</span></label>
              <input name="signatureDate" type="date" defaultValue={today} required className="w-full p-3 bg-bg border border-borderDark rounded-lg focus:border-primary focus:outline-none text-textDefault" />
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-borderDark">
          <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-primary hover:bg-blue-500 text-white font-bold rounded-lg text-lg transition-transform hover:-translate-y-1 shadow-xl flex items-center justify-center">
            {isSubmitting ? <span className="animate-pulse">Submitting...</span> : "📨 Submit Application"}
          </button>
          <button type="reset" className="px-10 py-4 bg-danger hover:bg-red-700 text-white font-bold rounded-lg text-lg transition-transform hover:-translate-y-1">
            🔄 Reset Form
          </button>
        </div>

      </form>
    </div>
  );
}
