import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewsroomPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 min-h-screen">
      <Link href="/" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div className="mb-12 border-b border-borderDark pb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Newsroom</h1>
        <p className="text-lg text-text2">
          Announcements, campaign updates, and advocacy efforts from IMAT.
        </p>
      </div>

      <div className="space-y-12">
        <div className="border border-borderDark border-dashed rounded-xl p-12 text-center bg-bg2">
          <p className="text-text3 font-mono text-sm uppercase tracking-widest">No articles found</p>
          <p className="text-sm text-text2 mt-2">Connect to Supabase to fetch live announcements.</p>
        </div>
      </div>
    </div>
  );
}
