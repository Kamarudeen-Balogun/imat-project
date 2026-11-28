import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Join IMAT · Membership Registration | IMAT FUTA",
  description:
    "Apply to join the Infrastructure Maintenance Awareness Team (IMAT) at FUTA — a student-led Civil Engineering body building a culture of care for campus infrastructure.",
  path: "/apply",
});

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
