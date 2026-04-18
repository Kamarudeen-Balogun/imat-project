"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// The PDF rendering depends on window, so we disable SSR
const ReportGenerator = dynamic(() => import("./ReportGenerator"), {
  ssr: false,
  loading: () => <div className="p-20 flex justify-center text-primary"><Loader2 className="animate-spin" size={32} /></div>
});

export default function Page() {
  return <ReportGenerator />;
}
