"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Charts use window/ResizeObserver — disable SSR
const AnalyticsCharts = dynamic(() => import("./AnalyticsCharts"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" size={40} />
    </div>
  ),
});

export default function AnalyticsPage() {
  return <AnalyticsCharts />;
}
