import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import AboutContactForm from "./AboutContactForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About IMAT · IMAT FUTA",
  description:
    "The Infrastructure Maintenance Awareness Team (IMAT) is a student-led advocacy body established in 2026 within the Civil Engineering Department at FUTA, bridging the gap between students and university management on campus infrastructure issues.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-16 sm:px-6 md:py-20">
      <Breadcrumbs className="mb-8" />

      <p className="mb-3 inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-primary">
        About The Team
      </p>
      <h1 className="page-title md:!text-5xl mb-6">About IMAT</h1>
      <p className="text-xl text-text2 leading-relaxed mb-16">
        The Infrastructure Maintenance Awareness Team (IMAT) is a student-led advocacy body established in 2026 within the Civil Engineering Department at FUTA. We bridge the gap between students and university management on campus infrastructure issues.
      </p>

      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <div>
          <h2 className="text-2xl font-black text-textDefault mb-6 border-b border-borderDark pb-4">Core Activities</h2>
          <ul className="space-y-4 text-textDefault">
            <li className="flex items-start gap-3">
              <span className="w-8 shrink-0 font-mono text-primary">01.</span>
              <span>Quarterly field assessments of campus infrastructure (roads, drains, walkways, buildings).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 shrink-0 font-mono text-primary">02.</span>
              <span>Maintaining a live, real-time database of campus defects and repair history.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 shrink-0 font-mono text-primary">03.</span>
              <span>Delivering biannual technical reports with prioritized engineering recommendations to the Works & Physical Planning Department.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 shrink-0 font-mono text-primary">04.</span>
              <span>Running advocacy campaigns and workshops for the broader campus community.</span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-black text-textDefault mb-6 border-b border-borderDark pb-4">Membership Eligibility</h2>
          <div className="glass-panel rounded-xl p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-mono text-text3 uppercase">Department</dt>
                <dd className="text-textDefault font-medium">Civil Engineering Only</dd>
              </div>
              <hr className="border-borderDark" />
              <div>
                <dt className="text-xs font-mono text-text3 uppercase">Level</dt>
                <dd className="text-textDefault font-medium">200L – 500L</dd>
              </div>
              <hr className="border-borderDark" />
              <div>
                <dt className="text-xs font-mono text-text3 uppercase">Minimum CGPA</dt>
                <dd className="text-textDefault font-medium">3.00</dd>
              </div>
              <hr className="border-borderDark" />
              <div>
                <dt className="text-xs font-mono text-text3 uppercase">Capacity</dt>
                <dd className="text-textDefault font-medium">Maximum 25 members per intake cycle</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-textDefault mb-8">Organizational Structure</h2>
      <div className="glass-panel rounded-xl p-5 sm:p-8 mb-8">
        {/* Indented hierarchy: each level sits further in than the one
            above it, joined by a thin line on the left. */}
        <div className="space-y-4">
          <div className="w-full max-w-sm p-3 sm:p-4 border border-primary/35 bg-primary/10 rounded-lg sm:text-center">
            <h3 className="font-bold text-textDefault text-sm sm:text-base">Faculty Advisor</h3>
            <p className="text-xs text-text2 mt-1">Academic and strategic oversight</p>
          </div>
          <div className="ml-4 sm:ml-8 border-l-2 border-primary/30 pl-4">
            <div className="w-full max-w-sm p-3 sm:p-4 border border-soft bg-bg rounded-lg sm:text-center">
              <h3 className="font-bold text-textDefault text-sm sm:text-base">President & Vice President</h3>
              <p className="text-xs text-text2 mt-1">Executive leadership and coordination</p>
            </div>
          </div>
          <div className="ml-8 sm:ml-16 border-l-2 border-primary/30 pl-4">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              {[
                "Documentation Officer",
                "Field Officer",
                "Advocacy Officer",
                "Technical Officer",
                "Works Dept Liaison",
                "Admin",
              ].map((role) => (
                <div key={role} className="p-3 border border-soft rounded-lg transition-colors bg-surfaceStrong sm:text-center sm:p-4">
                  <h4 className="font-semibold text-textDefault text-xs sm:text-sm">{role}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AboutContactForm />
    </div>
  );
}
