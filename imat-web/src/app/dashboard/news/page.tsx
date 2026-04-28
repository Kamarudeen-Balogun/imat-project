import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Calendar, Edit3, Megaphone, Plus } from "lucide-react";
import { format } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase/server";
import { canEditContent } from "@/lib/access";
import { getAnnouncementHref } from "@/lib/news";
import { sendAnnouncementPushNotifications } from "@/lib/push/server";
import Image from "next/image";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import DeleteAnnouncementButton from "./DeleteAnnouncementButton";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

type AnnouncementRow = {
  id: string;
  slug: string | null;
  title: string;
  visibility: "public" | "members_only";
  published_at: string;
  updated_at: string;
  image_url: string | null;
  author: { full_name: string | null } | null;
};

async function toggleAnnouncementVisibility(formData: FormData) {
  "use server";

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();

  if (!announcementId || !["public", "members_only"].includes(visibility)) {
    return;
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  const { data: existingAnnouncement } = await supabase
    .from("announcements")
    .select("id, slug, title, body, visibility")
    .eq("id", announcementId)
    .single();

  if (!existingAnnouncement) {
    redirect("/dashboard/news");
  }

  const previousVisibility = existingAnnouncement.visibility;

  await supabase
    .from("announcements")
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (previousVisibility === "members_only" && visibility === "public") {
    const { data: recipients } = await supabase
      .from("users")
      .select("id")
      .eq("status", "active")
      .eq("notifications_enabled", true);

    if (recipients && recipients.length > 0) {
      const { data: existingNotifications } = await supabase
        .from("notifications")
        .select("recipient_id")
        .eq("announcement_id", announcementId)
        .eq("type", "news_update");

      const alreadyNotified = new Set((existingNotifications ?? []).map((row) => row.recipient_id));

      const notificationRows = recipients
        .filter((recipient) => !alreadyNotified.has(recipient.id))
        .map((recipient) => ({
          recipient_id: recipient.id,
          created_by: user.id,
          announcement_id: announcementId,
          type: "news_update",
          title: existingAnnouncement.title,
          body: existingAnnouncement.body.trim().replace(/\s+/g, " ").slice(0, 180) || existingAnnouncement.title,
          href: getAnnouncementHref(existingAnnouncement.slug ?? announcementId),
        }));

      if (notificationRows.length > 0) {
        await supabase.from("notifications").insert(notificationRows);
      }
    }

    try {
      await sendAnnouncementPushNotifications(announcementId);
    } catch (error) {
      console.warn("Push notification delivery failed.", error);
    }
  }

  if (previousVisibility === "public" && visibility === "members_only") {
    const { data: applicantUsers } = await supabase
      .from("users")
      .select("id")
      .eq("status", "active")
      .eq("role", "applicant");

    const applicantIds = (applicantUsers ?? []).map((row) => row.id);
    if (applicantIds.length > 0) {
      await supabase
        .from("notifications")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("type", "news_update")
        .in("recipient_id", applicantIds);
    }
  }

  redirect("/dashboard/news");
}

async function deleteAnnouncement(formData: FormData) {
  "use server";

  const announcementId = String(formData.get("announcement_id") ?? "").trim();
  if (!announcementId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  await supabase.from("announcements").delete().eq("id", announcementId);
  redirect("/dashboard/news");
}

export default async function DashboardNewsPage() {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!canEditContent(profile?.role)) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("announcements")
    .select("id, slug, title, visibility, published_at, updated_at, image_url, author:users!announcements_author_id_fkey(full_name)")
    .order("published_at", { ascending: false });

   const announcements = (data ?? []) as unknown as AnnouncementRow[];

   return (
     <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
       <Breadcrumbs className="mb-8" />
       <div className="flex flex-wrap items-center justify-end gap-4 mb-8">
        <Link href="/dashboard/campaigns/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
          <Plus size={16} /> New Broadcast
        </Link>
      </div>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Megaphone size={14} /> Newsroom Manager
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Manage published broadcasts</h1>
        <p className="text-text2 max-w-2xl">Edit, update, or delete announcements. Updates preserve the original public link while refreshing timestamps and notifications.</p>
      </div>

      {announcements.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-soft border-dashed p-12 text-center text-text3">
          No announcements found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {announcements.map((item) => (
            <article key={item.id} className="glass-panel rounded-2xl p-6 shadow-lg shadow-black/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3 mb-3">
                    {item.visibility === "public" ? "Public" : "Members Only"}
                  </div>
                  <h2 className="text-xl font-bold text-textDefault">{item.title}</h2>
                </div>
                <div className="w-16 h-16 rounded-xl border border-soft overflow-hidden bg-bg shrink-0">
                  {item.image_url ? (
                    <Image
                      src={item.image_url && item.image_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(item.image_url, { width: 256 }) : item.image_url}
                      alt={item.title}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text3 text-[10px] font-mono">NO IMG</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text3 border-t border-soft pt-4 mt-4">
                <span className="inline-flex items-center gap-2"><Calendar size={14} /> Published {format(new Date(item.published_at), "MMM d, yyyy")}</span>
                <span>Updated {format(new Date(item.updated_at), "MMM d, yyyy")}</span>
              </div>

              <div className="mt-3 text-sm text-text2">
                By {item.author?.full_name ?? "IMAT Official"}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={toggleAnnouncementVisibility}>
                  <input type="hidden" name="announcement_id" value={item.id} />
                  <input type="hidden" name="visibility" value="public" />
                  <button
                    type="submit"
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      item.visibility === "public"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-soft text-text3 hover:border-primary/40 hover:text-primary"
                    }`}
                    disabled={item.visibility === "public"}
                  >
                    Set Public
                  </button>
                </form>
                <form action={toggleAnnouncementVisibility}>
                  <input type="hidden" name="announcement_id" value={item.id} />
                  <input type="hidden" name="visibility" value="members_only" />
                  <button
                    type="submit"
                    className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      item.visibility === "members_only"
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-soft text-text3 hover:border-warning/40 hover:text-warning"
                    }`}
                    disabled={item.visibility === "members_only"}
                  >
                    Set Internal
                  </button>
                </form>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/dashboard/news/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-textDefault hover:border-primary hover:text-primary transition-colors">
                  <Edit3 size={16} /> Edit
                </Link>
                <Link href={`/newsroom/${item.slug ?? item.id}`} className="inline-flex items-center gap-2 rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors">
                  View public page <ArrowRight size={16} />
                </Link>
                <DeleteAnnouncementButton
                  announcementId={item.id}
                  title={item.title}
                  deleteAction={deleteAnnouncement}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
