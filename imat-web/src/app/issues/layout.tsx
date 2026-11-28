import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Public Issue Tracker · IMAT FUTA",
  description:
    "Live tracking of all reported infrastructural issues on the FUTA campus. Internal severity metrics and officer assignments are hidden to protect student privacy and field operations.",
  path: "/issues",
});

export default function IssuesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
