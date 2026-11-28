import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Evidence Gallery · IMAT FUTA",
  description:
    "A continuous, documented record of infrastructural defects on the FUTA campus. Each card shows the original condition and the verified after state side by side.",
  path: "/evidence",
});

export default function EvidenceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
