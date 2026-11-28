import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "IMAT Members · IMAT FUTA",
  description:
    "Meet the members of the Infrastructure Maintenance Awareness Team (IMAT) at FUTA — the students advocating for better campus infrastructure.",
  path: "/members",
});

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
