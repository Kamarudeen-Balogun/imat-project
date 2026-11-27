import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ContactMessagesList, { type ContactMessageRow } from "./ContactMessagesList";

export const dynamic = "force-dynamic";

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
      ) : (
        <ContactMessagesList messages={messages} isOwner={isOwner} />
      )}
    </div>
  );
}
