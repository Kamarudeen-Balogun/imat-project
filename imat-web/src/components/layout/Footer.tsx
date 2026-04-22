import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-borderDark/75 bg-bg2/70 py-14 backdrop-blur-sm md:mt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 md:grid-cols-4">
        <div className="col-span-1 md:col-span-2">
          <p className="mb-3 inline-flex rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-primary">
            Infrastructure Maintenance Awareness Team
          </p>
          <h3 className="mb-4 text-lg font-bold text-textDefault">
            <span className="font-mono text-accent">IMAT</span> FUTA
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-text2">
            Student-led infrastructure advocacy body within the Civil Engineering Department at the Federal University of Technology, Akure.
          </p>
        </div>

        <div>
          <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-text3">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="text-textDefault transition-colors hover:text-primary">Home</Link></li>
            <li><Link href="/about" className="text-textDefault transition-colors hover:text-primary">About Us</Link></li>
            <li><Link href="/newsroom" className="text-textDefault transition-colors hover:text-primary">Newsroom</Link></li>
            <li><Link href="/apply" className="text-textDefault transition-colors hover:text-primary">Apply to Join</Link></li>
            <li><Link href="/login" className="text-textDefault transition-colors hover:text-primary">Member Login</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-mono text-xs uppercase tracking-wider text-text3">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/evidence" className="text-textDefault transition-colors hover:text-primary">Evidence Gallery</Link></li>
            <li><Link href="/issues" className="text-textDefault transition-colors hover:text-primary">Public Issue Tracker</Link></li>
            <li><Link href="/report" className="text-textDefault transition-colors hover:text-primary">Quick Report</Link></li>
            <li><Link href="/dashboard" className="text-textDefault transition-colors hover:text-primary">Member Portal</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-borderDark/80 px-4 pt-8 text-center text-xs text-text3 sm:px-6 md:flex-row md:text-left">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} IMAT FUTA. All rights reserved.</p>
        <p>Built with <span className="text-red-500">❤️</span> by <a href="mailto:codeflowx1@gmail.com" className="hover:text-primary transition-colors">codeflowx1@gmail.com</a></p>
      </div>
    </footer>
  );
}
