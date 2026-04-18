"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Disable SSR for react-pdf Viewer
const ExistingReportViewer = dynamic(() => import("./ExistingReportViewer"), {
  ssr: false,
  loading: () => <div className="p-20 flex justify-center text-primary"><Loader2 className="animate-spin" size={32} /></div>
});

export default function Page({ params }: { params: { id: string } }) {
  return <ExistingReportViewer reportId={params.id} />;
}
