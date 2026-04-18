import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12">
        <ArrowLeft size={16} /> Back to Home
      </Link>

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
          <div className="bg-bg2 border border-borderDark rounded-xl p-6">
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
      <div className="bg-bg2 border border-borderDark rounded-xl p-8 mb-8">
        <div className="flex flex-col items-center">
          <div className="w-48 text-center p-4 border border-primary/50 bg-primary/10 rounded-lg mb-8 relative">
            <h3 className="font-bold text-textDefault">Faculty Advisor</h3>
            <p className="text-xs text-text2 mt-1">Civil Engineering Lecturer</p>
            <div className="absolute h-8 w-px bg-borderDark bottom-[-32px] left-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="w-56 text-center p-4 border border-borderLit bg-bg rounded-lg mb-12 relative">
            <h3 className="font-bold text-textDefault">President / Team Lead</h3>
            <p className="text-xs text-text2 mt-1">500L Student</p>
            <div className="absolute h-12 w-px bg-borderDark bottom-[-48px] left-1/2 -translate-x-1/2"></div>
            {/* Horizontal branch line */}
            <div className="absolute h-px w-[80%] md:w-[600px] bg-borderDark bottom-[-48px] left-[10%] md:left-1/2 md:-translate-x-1/2 hidden md:block"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full relative pt-4">
            <div className="text-center p-4 border border-borderDark rounded-lg hover:border-text3 transition-colors bg-bg">
              <h4 className="font-semibold text-textDefault text-sm">Documentation Officer</h4>
            </div>
            <div className="text-center p-4 border border-borderDark rounded-lg hover:border-text3 transition-colors bg-bg">
              <h4 className="font-semibold text-textDefault text-sm">Field Assessment Officer</h4>
            </div>
            <div className="text-center p-4 border border-borderDark rounded-lg hover:border-text3 transition-colors bg-bg">
              <h4 className="font-semibold text-textDefault text-sm">Advocacy & Outreach</h4>
            </div>
            <div className="text-center p-4 border border-borderDark rounded-lg hover:border-text3 transition-colors bg-bg">
              <h4 className="font-semibold text-textDefault text-sm">Technical Officer</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
