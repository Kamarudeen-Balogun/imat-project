import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Report an Infrastructure Defect · IMAT FUTA",
  description:
    "Submit a structured defect ticket with category, severity, location, and evidence so IMAT can route it for technical review at FUTA.",
  path: "/report",
});

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
