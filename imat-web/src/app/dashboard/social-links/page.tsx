"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import { Loader2, Save } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { canManageSocialLinks } from "@/lib/access";
import { defaultSocialLinks, mergeSocialLinks, type SocialLinkRecord } from "@/lib/socialLinks";

type SocialRow = {
  id: string;
  platform: SocialLinkRecord["platform"];
  label: string;
  url: string;
  is_enabled: boolean;
  sort_order: number;
};

export default function SocialLinksAdminPage() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [links, setLinks] = useState<SocialLinkRecord[]>(defaultSocialLinks);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: userProfile } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      const allowed = canManageSocialLinks(userProfile?.role);
      setIsAdmin(allowed);

      if (!allowed) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("site_social_links")
        .select("id, platform, label, url, is_enabled, sort_order")
        .order("sort_order", { ascending: true });

      if (error) {
        if (error.code === "42P01") {
          setTableMissing(true);
        }
      } else {
        setLinks(mergeSocialLinks((data ?? []) as SocialRow[]));
      }

      setLoading(false);
    };

    void load();
  }, [supabase]);

  const saveChanges = async () => {
    if (!userId) return;
    setSaving(true);

    const payload = links.map((item) => ({
      platform: item.platform,
      label: item.label,
      url: item.url,
      is_enabled: item.is_enabled,
      sort_order: item.sort_order,
      updated_by: userId,
    }));

    const { error } = await supabase.from("site_social_links").upsert(payload, { onConflict: "platform" });

    if (error) {
      toast.error("Could not save social links.");
    } else {
      toast.success("Social links updated.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-text3">
        <Loader2 size={18} className="mx-auto mb-3 animate-spin" />
        Loading social links manager...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-text3">
        You do not have access to this page.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6">
      <Breadcrumbs className="mb-2" />

      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-bold text-textDefault">Social Links Manager</h1>
        <p className="mt-2 text-sm text-text2">
          Update social URLs and toggle visibility. Disabled links stay hidden and cannot be clicked in the public footer dock.
        </p>
      </div>

      {tableMissing && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
          Missing table: <strong>site_social_links</strong>. Add the SQL block in <code>supabase_schema.sql</code> to enable persistence.
        </div>
      )}

      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="space-y-4">
          {links.map((item, index) => (
            <div key={item.platform} className="rounded-xl border border-soft bg-bg p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-textDefault">{item.label}</p>
                <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text3">
                  <input
                    type="checkbox"
                    checked={item.is_enabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setLinks((current) =>
                        current.map((row, rowIndex) => (rowIndex === index ? { ...row, is_enabled: checked } : row))
                      );
                    }}
                  />
                  Enabled
                </label>
              </div>

              <input
                value={item.url}
                onChange={(event) => {
                  const nextUrl = event.target.value;
                  setLinks((current) =>
                    current.map((row, rowIndex) => (rowIndex === index ? { ...row, url: nextUrl } : row))
                  );
                }}
                className="w-full rounded-lg border border-soft bg-surfaceStrong px-3 py-2 text-sm text-textDefault focus:border-primary focus:outline-none"
                placeholder="https://..."
              />
            </div>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => void saveChanges()}
            disabled={saving || tableMissing}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Social Links"}
          </button>
        </div>
      </div>
    </div>
  );
}
