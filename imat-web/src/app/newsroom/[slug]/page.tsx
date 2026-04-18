import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewsPostPage({ params }: { params: { slug: string } }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 min-h-screen">
      <Link href="/newsroom" className="inline-flex items-center gap-2 text-text3 hover:text-primary transition-colors text-sm font-mono mb-12">
        <ArrowLeft size={16} /> Back to Newsroom
      </Link>

      <article className="prose prose-invert prose-blue max-w-none">
        <div className="mb-4 text-sm font-mono text-text3 uppercase">
          {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">
          Post: {params.slug}
        </h1>
        <div className="border border-borderDark p-8 rounded-xl bg-bg2 text-text2 text-center">
          <p>This is a placeholder for the post content from Supabase / Tiptap JSON.</p>
        </div>
      </article>
    </div>
  );
}
