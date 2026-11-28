import NewsroomClient from "./NewsroomClient";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Newsroom | IMAT FUTA",
  description: "Official announcements, advocacy campaigns, and updates from the Infrastructure Maintenance Awareness Team.",
  path: "/newsroom",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewsroomPage() {
  return <NewsroomClient />;
}
