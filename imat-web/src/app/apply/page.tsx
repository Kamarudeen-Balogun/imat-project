"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { sanitizePlainText, sanitizeEmail, sanitizePhoneNumber, sanitizeNumericText } from "@/lib/inputSanitizer";
import TurnstileWidget from "@/components/security/TurnstileWidget";
import { TURNSTILE_DEV_BYPASS_TOKEN, isTurnstileDevBypassEnabled } from "@/lib/turnstile";

const APPLY_DRAFT_STORAGE_KEY = "imat_apply_form_draft_v1";

type DraftValue = string | string[];

function parseDraft(raw: string): Record<string, DraftValue> | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const output: Record<string, DraftValue> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        output[key] = value;
      } else if (Array.isArray(value)) {
        const valid = value.filter((entry): entry is string => typeof entry === "string");
        output[key] = valid;
      }
    }

    return output;
  } catch {
    return null;
  }
}

function buildDraftPayload(formDataObj: FormData): Record<string, DraftValue> {
  const payload: Record<string, DraftValue> = {};
  const skipKeys = new Set(["website", "turnstileToken"]);

  for (const [key, value] of formDataObj.entries()) {
    if (skipKeys.has(key) || typeof value !== "string") {
      continue;
    }

    if (payload[key] === undefined) {
      payload[key] = value;
      continue;
    }

    const currentValue = payload[key];
    if (Array.isArray(currentValue)) {
      currentValue.push(value);
    } else {
      payload[key] = [currentValue, value];
    }
  }

  return payload;
}

export default function ApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  
  // States to handle dynamic visibility and logic
  const [selectedLevel, setSelectedLevel] = useState("");
  const [hasLeadership, setHasLeadership] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const persistDraftFromForm = (form: HTMLFormElement) => {
    if (typeof window === "undefined") {
      return;
    }

    const draftPayload = buildDraftPayload(new FormData(form));
    window.localStorage.setItem(APPLY_DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
  };

  const clearDraft = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(APPLY_DRAFT_STORAGE_KEY);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !formRef.current) {
      return;
    }

    const rawDraft = window.localStorage.getItem(APPLY_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }

    const draft = parseDraft(rawDraft);
    if (!draft) {
      window.localStorage.removeItem(APPLY_DRAFT_STORAGE_KEY);
      return;
    }

    const form = formRef.current;

    for (const [name, value] of Object.entries(draft)) {
      const elements = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`);
      if (elements.length === 0) {
        continue;
      }

      elements.forEach((element) => {
        if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
          if (Array.isArray(value)) {
            element.checked = value.includes(element.value);
          } else if (element.type === "checkbox") {
            element.checked = value === element.value || value === "on";
          } else {
            element.checked = value === element.value;
          }
          return;
        }

        if (Array.isArray(value)) {
          return;
        }

        element.value = value;
      });
    }

    const restoredLevel = draft.level;
    if (typeof restoredLevel === "string") {
      setSelectedLevel(restoredLevel);
    }

    const restoredLeadership = draft.leadership;
    if (typeof restoredLeadership === "string") {
      setHasLeadership(restoredLeadership);
    }

    toast("Restored your saved application draft.");
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.currentTarget;
    const formDataObj = new FormData(form);

    // Helpers
    const getVal = (name: string) => (formDataObj.get(name) as string) || "";
    const getMultiple = (name: string) => formDataObj.getAll(name).map(v => v.toString());

    const bypassToken = isTurnstileDevBypassEnabled() ? TURNSTILE_DEV_BYPASS_TOKEN : "";

    const dataPayload = {
      fullName: sanitizePlainText(getVal("fullName"), 120),
      matricNumber: sanitizePlainText(getVal("matricNumber"), 40),
      gender: sanitizePlainText(getVal("gender"), 20),
      level: sanitizeNumericText(getVal("level"), 4),
      email: sanitizeEmail(getVal("email")),
      phone: sanitizePhoneNumber(getVal("phone")),
      address: sanitizePlainText(getVal("address"), 200),
      cgpa: sanitizePlainText(getVal("cgpa"), 8),
      graduationYear: sanitizeNumericText(getVal("graduationYear"), 4),
      leadership: sanitizePlainText(getVal("leadership"), 10),
      leadershipDetail: sanitizePlainText(getVal("leadershipDetailsText"), 1000),
      workingGroups: getMultiple("workingGroups"),
      positions: getMultiple("positions"),
      skills: getMultiple("skills"),
      otherSkills: sanitizePlainText(getVal("otherSkills"), 300),
      motivation: sanitizePlainText(getVal("motivation"), 4000),
      timeCommitment: sanitizePlainText(getVal("timeCommitment"), 100),
      refereeName: sanitizePlainText(getVal("refereeName"), 120),
      refereeDept: sanitizePlainText(getVal("refereeDept"), 120),
      refereeEmail: sanitizeEmail(getVal("refereeEmail")),
      refereePhone: sanitizePhoneNumber(getVal("refereePhone")),
      agreement: getVal("agreement") === "on" ? "Yes, I agree" : "",
      signature: sanitizePlainText(getVal("signature"), 120),
      signatureDate: sanitizePlainText(getVal("signatureDate") || today, 20),
      honeypot: sanitizePlainText(getVal("website"), 120),
      turnstileToken: turnstileToken.trim() || bypassToken,
    };

    if (!dataPayload.turnstileToken) {
      toast.error("Please complete the bot check before submitting.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataPayload),
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseData?.error || "Application submission failed.");
      }

      clearDraft();
      setSubmitSuccess(true);
      toast.success("Application successfully submitted!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong saving your application.";
      console.error("Application submit failed.", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

   if (submitSuccess) {
     return (
       <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-20">
         <CheckCircle2 size={64} className="text-success mx-auto mb-6" />
         <h1 className="text-3xl font-black text-textDefault mb-4">Application Submitted!</h1>
         <p className="text-text2 mb-8">
           Thank you for applying to join IMAT-FUTA. Your responses have been recorded and sent successfully!
         </p>
         <Link href="/" className="px-8 py-4 bg-primary text-white font-bold rounded-lg hover:brightness-110 transition-colors">
           Return Home
         </Link>
       </div>
     );
   }

   return (
     <div className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
       <Breadcrumbs className="mb-8" />

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-textDefault mb-4 uppercase">Membership Registration</h1>
        <p className="text-lg sm:text-xl text-primary font-bold mb-2">Infrastructure Maintenance Awareness Team (IMAT-FUTA)</p>
        <p className="text-text3 italic">&quot;Building a Culture of Care for Campus Infrastructure&quot;</p>
      </div>

      <div className="mb-8 rounded border-l-4 border-warning bg-warningDim p-4 text-sm text-textDefault">
        <strong>INSTRUCTIONS:</strong> Please fill out this form completely. All fields marked with <span className="text-danger">*</span> are mandatory.
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onChange={(event) => {
          const currentForm = event.currentTarget;
          persistDraftFromForm(currentForm);

          const levelValue = new FormData(currentForm).get("level");
          setSelectedLevel(typeof levelValue === "string" ? levelValue : "");

          const leadershipValue = new FormData(currentForm).get("leadership");
          setHasLeadership(typeof leadershipValue === "string" ? leadershipValue : "");
        }}
        onReset={() => {
          clearDraft();
          setSelectedLevel("");
          setHasLeadership("");
          setTurnstileToken("");
          setHoneypot("");
        }}
        className="glass-panel space-y-12 overflow-hidden rounded-xl p-6 md:p-10"
      >
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
        {/* SECTION A */}
        <section>
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section A: Personal Information</h2>
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-textDefault mb-2">Full Name (Surname First) <span className="text-danger">*</span></label>
              <input name="fullName" type="text" placeholder="e.g., ADEYEMI John Oluwaseun" required className="field" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Matriculation Number <span className="text-danger">*</span></label>
                <input name="matricNumber" type="text" placeholder="e.g., CVE/20/5001" required className="field" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Gender <span className="text-danger">*</span></label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="radio-card"><input type="radio" name="gender" value="Male" required className="h-4 w-4 shrink-0 cursor-pointer" /> Male</label>
                  <label className="radio-card"><input type="radio" name="gender" value="Female" required className="h-4 w-4 shrink-0 cursor-pointer" /> Female</label>
                </div>
              </div>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Current Level <span className="text-danger">*</span></label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {["200L", "300L", "400L", "500L"].map(lvl => (
                  <label key={lvl} className="radio-card">
                    <input type="radio" name="level" value={lvl} required className="h-4 w-4 shrink-0 cursor-pointer" /> {lvl}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Email Address <span className="text-danger">*</span></label>
                <input name="email" type="email" placeholder="youremail@gmail.com" required className="field" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Phone Number <span className="text-danger">*</span></label>
                <input name="phone" type="tel" maxLength={11} pattern="\d{11}" placeholder="08000000000" title="Must be exactly 11 digits" required className="field" />
                <span className="text-xs text-text3 mt-1 block">Must be exactly 11 digits</span>
              </div>
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Residential Address on Campus</label>
              <input name="address" type="text" placeholder="e.g., Block A, Room 12, Jaja Hall" className="field" />
            </div>
          </div>
        </section>

        {/* SECTION B */}
        <section>
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section B: Academic Information</h2>
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
              <input name="graduationYear" type="text" placeholder="e.g., 2026" className="field" />
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Any Previous Leadership Experience?</label>
              <div className="flex gap-6 mt-3 text-textDefault">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="leadership" value="Yes" className="w-4 h-4 cursor-pointer" /> Yes</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="leadership" value="No" className="w-4 h-4 cursor-pointer" /> No</label>
              </div>
            </div>
            {hasLeadership === "Yes" && (
              <div>
                <label className="block font-bold text-textDefault mb-2">If YES, please provide details:</label>
                <textarea name="leadershipDetailsText" rows={3} placeholder="Describe your previous leadership roles..." className="field"></textarea>
              </div>
            )}
          </div>
        </section>

        {/* SECTION C */}
        <section>
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section C: Areas of Interest & Skills</h2>
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
              <input name="otherSkills" type="text" placeholder="e.g., Project management, Event planning, etc." className="field" />
            </div>
          </div>
        </section>

        {/* SECTION D */}
        <section>
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section D: Motivation & Commitment</h2>
          <div className="space-y-6">
            <div>
              <label className="block font-bold text-textDefault mb-2">Why do you want to join IMAT? <span className="text-danger">*</span></label>
              <textarea name="motivation" rows={4} placeholder="Explain your motivation for joining IMAT..." required className="field"></textarea>
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
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section E: References</h2>
          <p className="italic text-text2 mb-6">Provide ONE academic reference (Lecturer / Course Advisor):</p>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Name of Referee</label>
                <input name="refereeName" type="text" placeholder="e.g., Dr. John Smith" className="field" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Department</label>
                <input name="refereeDept" type="text" placeholder="e.g., Civil Engineering" className="field" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-textDefault mb-2">Referee Email</label>
                <input name="refereeEmail" type="email" placeholder="referee.email@futa.edu.ng" className="field" />
              </div>
              <div>
                <label className="block font-bold text-textDefault mb-2">Referee Phone</label>
                <input name="refereePhone" type="tel" maxLength={11} pattern="\d{11}" placeholder="08000000000" title="Must be exactly 11 digits" className="field" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION F */}
        <section>
          <h2 className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-2.5 text-base font-black uppercase tracking-wide text-primary mb-6">Section F: Declaration</h2>
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
              <input name="signature" type="text" placeholder="Type your full name" required className="field" />
            </div>
            <div>
              <label className="block font-bold text-textDefault mb-2">Date <span className="text-danger">*</span></label>
              <input name="signatureDate" type="date" defaultValue={today} required className="field" />
            </div>
          </div>
        </section>

        <div className="max-w-md rounded-xl border border-borderDark bg-bg2/70 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-textDefault">Quick safety check</h3>
          <p className="mt-1 text-xs text-text3">This simple check protects the form from spam and should only take a moment.</p>
          <TurnstileWidget
            onTokenChange={setTurnstileToken}
            onError={() => toast.error("Security check unavailable. Please refresh and try again.")}
            className="mt-3"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8 border-t border-borderDark">
          <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-primary hover:brightness-110 text-white font-bold rounded-lg text-base md:text-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
            {isSubmitting ? <span className="animate-pulse">Submitting...</span> : <><Send size={18} /> Submit Application</>}
          </button>
          <button type="reset" className="px-6 py-3 bg-danger hover:brightness-110 text-white font-bold rounded-lg text-base md:text-lg transition-transform hover:-translate-y-1 flex items-center justify-center gap-2">
            <RotateCcw size={18} /> Reset Form
          </button>
        </div>

      </form>
    </div>
  );
}
