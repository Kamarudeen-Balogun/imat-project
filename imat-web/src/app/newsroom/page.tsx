import NewsroomClient from "./NewsroomClient";

export const metadata = {
  title: "Newsroom | IMAT FUTA",
  description: "Official announcements, advocacy campaigns, and updates from the Infrastructure Maintenance Awareness Team.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewsroomPage() {
  return <NewsroomClient />;
}
