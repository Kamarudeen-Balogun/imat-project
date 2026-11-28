import { redirect } from "next/navigation";

// /portal itself used to 404 while /portal/analytics works — send visitors
// to the analytics page, which is the portal's only live section.
export default function PortalPage() {
  redirect("/portal/analytics");
}
