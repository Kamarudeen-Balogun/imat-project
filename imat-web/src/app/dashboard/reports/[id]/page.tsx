"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

// Disable SSR for react-pdf Viewer
const ExistingReportViewer = dynamic(() => import("./ExistingReportViewer"), {
  ssr: false,
  loading: () => <div className="p-20 flex justify-center text-primary"><Loader2 className="animate-spin" size={32} /></div>
});

export default function Page() {
  const params = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Breadcrumbs className="mb-8" />
      <ExistingReportViewer reportId={params.id} />
    </div>
  );
}
