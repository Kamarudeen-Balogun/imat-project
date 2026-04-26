import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import AboutContactForm from "./AboutContactForm";

export default function AboutPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-16 sm:px-6 md:py-20">
      <Breadcrumbs className="mb-8" />

      <p className="mb-3 inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-primary">
        About The Team
      </p>
      <h1 className="text-4xl md:text-5xl font-bold text-textDefault mb-6">About IMAT</h1>
      <p className="text-xl text-text2 leading-relaxed mb-16">
        The Infrastructure Maintenance Awareness Team (IMAT) is a student-led advocacy body established in 2026 within the Civil Engineering Department at FUTA. We bridge the gap between students and university management on campus infrastructure issues.
      </p>

      <div className="grid md:grid-cols-2 gap-12 mb-20">
        <div>
          <h2 className="text-2xl font-bold text-textDefault mb-6 border-b border-borderDark pb-4">Core Activities</h2>
          <ul className="space-y-4 text-textDefault">
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">01.</span>
              <span>Quarterly field assessments of campus infrastructure (roads, drains, walkways, buildings).</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">02.</span>
              <span>Maintaining a live, real-time database of campus defects and repair history.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">03.</span>
              <span>Delivering biannual technical reports with prioritized engineering recommendations to the Works & Physical Planning Department.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">04.</span>
              <span>Running advocacy campaigns and workshops for the broader campus community.</span>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-textDefault mb-6 border-b border-borderDark pb-4">Membership Eligibility</h2>
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

      <h2 className="text-2xl font-bold text-textDefault mb-8">Organizational Structure</h2>
      <div className="glass-panel rounded-xl p-8 mb-8">
        <div className="flex flex-col items-center gap-5 mb-10">
          <div className="w-full max-w-sm text-center p-4 border border-primary/35 bg-primary/10 rounded-lg">
            <h3 className="font-bold text-textDefault">Faculty Advisor</h3>
            <p className="text-xs text-text2 mt-1">Academic and strategic oversight</p>
          </div>
          <div className="w-full max-w-sm text-center p-4 border border-soft bg-bg rounded-lg">
            <h3 className="font-bold text-textDefault">President & Vice President</h3>
            <p className="text-xs text-text2 mt-1">Executive leadership and coordination</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[
            "Documentation Officer",
            "Field Officer",
            "Advocacy Officer",
            "Technical Officer",
            "Works Dept Liaison",
            "Admin",
          ].map((role) => (
            <div key={role} className="text-center p-4 border border-soft rounded-lg transition-colors bg-surfaceStrong">
              <h4 className="font-semibold text-textDefault text-sm">{role}</h4>
            </div>
          ))}
        </div>
      </div>

      <AboutContactForm />
    </div>
  );
}
