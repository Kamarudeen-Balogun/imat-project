import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-borderDark bg-bg2 py-12 mt-16 md:mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <h3 className="font-mono text-lg font-bold text-white mb-4"><span className="text-accent">IMAT</span> FUTA</h3>
          <p className="text-text2 text-sm leading-relaxed max-w-sm">
            Student-led infrastructure advocacy body within the Civil Engineering Department at the Federal University of Technology, Akure.
          </p>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-text3 mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="text-textDefault hover:text-primary transition-colors">Home</Link></li>
            <li><Link href="/about" className="text-textDefault hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/newsroom" className="text-textDefault hover:text-primary transition-colors">Newsroom</Link></li>
            <li><Link href="/apply" className="text-textDefault hover:text-primary transition-colors">Apply to Join</Link></li>
            <li><Link href="/login" className="text-textDefault hover:text-primary transition-colors">Member Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-text3 mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/evidence" className="text-textDefault hover:text-primary transition-colors">Evidence Gallery</Link></li>
            <li><Link href="/issues" className="text-textDefault hover:text-primary transition-colors">Public Issue Tracker</Link></li>
            <li><Link href="/report" className="text-textDefault hover:text-primary transition-colors">Quick Report</Link></li>
            <li><Link href="/dashboard" className="text-textDefault hover:text-primary transition-colors">Admin Portal</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-borderDark flex flex-col md:flex-row justify-between items-center text-xs text-text3 gap-2 text-center md:text-left">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} IMAT FUTA. All rights reserved.</p>
        <p>Built for a Culture of Care.</p>
        <br/>
          <h6>Built with 🧡 by: codeflowx1@gmail.com</h6>
      </div>
    </footer>
  );
}
