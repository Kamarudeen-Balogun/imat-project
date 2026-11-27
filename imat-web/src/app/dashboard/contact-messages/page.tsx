import { redirect } from "next/navigation";
import { Calendar, Mail, MailOpen, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const dynamic = "force-dynamic";

type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  purpose: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const PURPOSE_LABELS: Record<string, string> = {
  partnership: "Partnership",
  media_inquiries: "Media Inquiries",
  infrastructure_related_concern: "Infrastructure Related Concern",
  meetings: "Meetings",
  contact_developer: "Contact Developer",
};

function formatPurpose(purpose: string) {
  return PURPOSE_LABELS[purpose] ?? purpose.replaceAll("_", " ");
}

async function markMessageAsRead(formData: FormData) {
  "use server";

  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/dashboard");
  }

  // No UPDATE policy exists on contact_messages, so the update runs
  // through the service-role client after the session check above.
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("contact_messages")
      .update({ is_read: true })
      .eq("id", messageId);

    if (error) {
      console.warn("Failed to mark contact message as read.", error);
    }
  } catch (error) {
    console.warn("Failed to mark contact message as read.", error);
  }

  redirect("/dashboard/contact-messages");
}

async function deleteMessage(formData: FormData) {
  "use server";

  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return;

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

  // Only the owner may delete contact messages. Anyone else is sent back
  // without deleting anything.
  if (!profile || profile.role !== "owner") {
    redirect("/dashboard/contact-messages");
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("contact_messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.warn("Failed to delete contact message.", error);
    }
  } catch (error) {
    console.warn("Failed to delete contact message.", error);
  }

  redirect("/dashboard/contact-messages");
}

export default async function DashboardContactMessagesPage() {
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

  if (!profile) {
    redirect("/dashboard");
  }

  const isOwner = profile.role === "owner";

  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, name, email, purpose, subject, message, is_read, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to load contact messages.", error);
  }

  const messages = (data ?? []) as unknown as ContactMessageRow[];
  const unreadCount = messages.filter((message) => !message.is_read).length;

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 px-4 pb-16 pt-6 sm:px-6">
      <Breadcrumbs className="mb-8" />

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-primary mb-4">
          <Mail size={14} /> Contact Inbox
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Contact messages</h1>
        <p className="text-text2 max-w-2xl">
          Messages sent through the public contact form.{" "}
          {messages.length > 0
            ? `${messages.length} message${messages.length === 1 ? "" : "s"} received${unreadCount > 0 ? `, ${unreadCount} unread` : ", all read"}.`
            : "Nothing here yet."}
        </p>
      </div>

      {error ? (
        <div className="glass-panel rounded-2xl border border-soft p-12 text-center text-text3">
          Could not load contact messages. Please try again later.
        </div>
      ) : messages.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-soft border-dashed p-12 text-center text-text3">
          No contact messages yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {messages.map((message) => (
            <article key={message.id} className="glass-panel rounded-2xl p-6 shadow-lg shadow-black/5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
                      {formatPurpose(message.purpose)}
                    </span>
                    {!message.is_read && (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
                        New
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-textDefault">{message.subject}</h2>
                </div>
              </div>

              <div className="text-sm text-text2">
                <p>
                  <span className="font-semibold text-textDefault">{message.name}</span>{" "}
                  <a href={`mailto:${message.email}`} className="text-primary hover:underline break-all">
                    {message.email}
                  </a>
                </p>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text2">{message.message}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text3 border-t border-soft pt-4 mt-4">
                <span className="inline-flex items-center gap-2">
                  <Calendar size={14} /> {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {!message.is_read && (
                  <form action={markMessageAsRead}>
                    <input type="hidden" name="message_id" value={message.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-soft px-3 py-1.5 text-xs font-semibold text-text3 transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <MailOpen size={14} /> Mark read
                    </button>
                  </form>
                )}
                {isOwner && (
                  <form action={deleteMessage}>
                    <input type="hidden" name="message_id" value={message.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
