"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import optimizeCloudinaryUrl from "@/lib/cloudinary";
import Image from "next/image";
import { createSupabaseClient } from "@/lib/supabase/client";
import { Loader2, Trash2, Upload, Edit2, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { sanitizePlainText, sanitizeNumericText } from "@/lib/inputSanitizer";

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  phone: string | null;
  level: number | null;
  status: string | null;
  joined_at: string | null;
  avatar_url: string | null;
};

function getRoleLabel(role: string | null | undefined) {
  if (!role) return "Member";
  return role.replace(/_/g, " ");
}

export default function DashboardProfilePage() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editingLevel, setEditingLevel] = useState(false);
  const [editedLevel, setEditedLevel] = useState<string>("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, role, phone, level, status, joined_at, avatar_url")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        toast.error("Could not load your profile.");
      } else {
        setProfile(data as ProfileRow);
        setEditedName(data.full_name || "");
        setEditedPhone(data.phone || "");
        setEditedLevel(data.level ? String(data.level) : "");
      }

      setLoading(false);
    };

    void loadProfile();
  }, [supabase]);

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS ||
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PHOTOS;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary upload settings are missing.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Image upload failed.");
    }

    const data = (await response.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error("Upload succeeded but image URL is missing.");
    }

    return data.secure_url;
  };

  const saveAvatarUrl = async (avatarUrl: string | null) => {
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", profile.id);

    if (error) {
      toast.error("Could not save profile picture.");
    } else {
      setProfile({ ...profile, avatar_url: avatarUrl });
      toast.success(avatarUrl ? "Profile picture updated." : "Profile picture removed.");
    }
    setSaving(false);
  };

  const saveFullName = async () => {
    if (!profile) return;
    
    const trimmedName = editedName.trim();
    const safeName = sanitizePlainText(trimmedName, 120);
    if (!safeName) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name: safeName })
      .eq("id", profile.id);

    if (error) {
      toast.error("Could not update your name.");
      setSaving(false);
      return;
    }

    setProfile({ ...profile, full_name: safeName });
    setEditingName(false);
    toast.success("Name updated successfully.");
    setSaving(false);
  };

  const cancelEditName = () => {
    setEditedName(profile?.full_name || "");
    setEditingName(false);
  };

  const saveLevel = async () => {
    if (!profile) return;

    const parsed = Number(sanitizeNumericText(editedLevel, 4));
    if (!Number.isInteger(parsed) || parsed < 200 || parsed > 500) {
      toast.error("Enter a valid level between 200 and 500.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ level: parsed })
      .eq("id", profile.id);

    if (error) {
      toast.error("Could not update your level.");
      setSaving(false);
      return;
    }

    setProfile({ ...profile, level: parsed });
    setEditingLevel(false);
    toast.success("Level updated successfully.");
    setSaving(false);
  };

  const cancelEditLevel = () => {
    setEditedLevel(profile?.level ? String(profile.level) : "");
    setEditingLevel(false);
  };

  const savePhone = async () => {
    if (!profile) return;

    // Same shape as the /apply form: exactly 11 digits.
    const digits = sanitizeNumericText(editedPhone, 11);
    if (!/^\d{11}$/.test(digits)) {
      toast.error("Enter an 11-digit phone number.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ phone: digits })
      .eq("id", profile.id);

    if (error) {
      toast.error("Could not update your phone number.");
      setSaving(false);
      return;
    }

    setProfile({ ...profile, phone: digits });
    setEditingPhone(false);
    toast.success("Phone number updated successfully.");
    setSaving(false);
  };

  const cancelEditPhone = () => {
    setEditedPhone(profile?.phone || "");
    setEditingPhone(false);
  };

  const onChooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const avatarUrl = await uploadToCloudinary(file);
      await saveAvatarUrl(avatarUrl);
    } catch {
      console.error("Profile image upload failed.");
      toast.error("Could not upload that image. Try another file.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-text3">
        <Loader2 size={20} className="mx-auto mb-3 animate-spin" />
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-text3">
        Your profile could not be loaded.
      </div>
    );
  }

  const initials = (profile.full_name || profile.email || "M").slice(0, 1).toUpperCase();
  const joinedDate = profile.joined_at
    ? new Date(profile.joined_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";

   return (
     <div className="mx-auto max-w-3xl px-4 py-6 animate-in fade-in duration-500 sm:px-6">
       <Breadcrumbs className="mb-8" />
       <h1 className="text-2xl md:text-3xl font-bold text-textDefault mb-2">Profile Settings</h1>
      <p className="text-text2 mb-8">Manage your name, level, and display picture for the dashboard, member pages, and homepage highlights.</p>

      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="h-20 w-20 rounded-full border border-soft overflow-hidden bg-gradient-to-br from-primary/25 to-accent/20 flex items-center justify-center text-lg font-bold text-textDefault">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url && profile.avatar_url.includes('res.cloudinary.com') ? optimizeCloudinaryUrl(profile.avatar_url) : profile.avatar_url}
                alt={profile.full_name ?? "Member"}
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            {!editingName ? (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-textDefault truncate">{profile.full_name ?? "IMAT Member"}</h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="p-1.5 rounded-lg hover:bg-bg3 transition-colors text-text3 hover:text-primary"
                  title="Edit name"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  maxLength={100}
                  className="px-3 py-2 rounded-lg border border-primary bg-bg text-textDefault placeholder-text3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter your full name"
                  autoFocus
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveFullName}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    onClick={cancelEditName}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-soft bg-bg3 px-3 py-1.5 text-xs font-semibold text-text3 hover:bg-borderDark transition-colors disabled:opacity-50"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}
            <p className="text-sm text-text2 mt-2 break-all">{profile.email}</p>
            <p className="mt-1 inline-flex rounded-full border border-soft bg-bg px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-text3">
              {getRoleLabel(profile.role)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-soft bg-bg p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text3">Phone</p>
            {!editingPhone ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-textDefault break-all">{profile.phone || "Not set"}</p>
                <button
                  onClick={() => setEditingPhone(true)}
                  className="p-1.5 rounded-lg hover:bg-bg3 transition-colors text-text3 hover:text-primary"
                  title="Edit phone number"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(event) => setEditedPhone(event.target.value)}
                  maxLength={11}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-primary bg-bg px-2.5 py-2 text-sm text-textDefault placeholder-text3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="08000000000"
                  autoFocus
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <button
                    onClick={savePhone}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    onClick={cancelEditPhone}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-soft bg-bg3 px-2.5 py-1 text-xs font-semibold text-text3 hover:bg-borderDark transition-colors disabled:opacity-50"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-soft bg-bg p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text3">Current Level</p>
            {!editingLevel ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-textDefault">{profile.level ? `${profile.level}L` : "Not set"}</p>
                <button
                  onClick={() => setEditingLevel(true)}
                  className="p-1.5 rounded-lg hover:bg-bg3 transition-colors text-text3 hover:text-primary"
                  title="Edit level"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <select
                  value={editedLevel}
                  onChange={(event) => setEditedLevel(event.target.value)}
                  className="w-full rounded-lg border border-primary bg-bg px-2.5 py-2 text-sm text-textDefault focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={saving}
                >
                  <option value="">Select level</option>
                  <option value="200">200L</option>
                  <option value="300">300L</option>
                  <option value="400">400L</option>
                  <option value="500">500L</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={saveLevel}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <Check size={12} /> Save
                  </button>
                  <button
                    onClick={cancelEditLevel}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg border border-soft bg-bg3 px-2.5 py-1 text-xs font-semibold text-text3 hover:bg-borderDark transition-colors disabled:opacity-50"
                  >
                    <X size={12} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-soft bg-bg p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text3">Status</p>
            <p className="mt-2 text-sm font-semibold text-textDefault capitalize">{profile.status ?? "active"}</p>
          </div>

          <div className="rounded-xl border border-soft bg-bg p-3">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text3">Joined</p>
            <p className="mt-2 text-sm font-semibold text-textDefault">{joinedDate}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors">
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload new picture"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={onChooseFile}
              disabled={uploading || saving}
            />
          </label>

          <button
            type="button"
            onClick={() => void saveAvatarUrl(null)}
            disabled={saving || uploading || !profile.avatar_url}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} /> Remove picture
          </button>
        </div>

        {(saving || uploading) && (
          <div className="mt-4 text-xs text-text3 font-mono uppercase tracking-wider">Saving changes...</div>
        )}
      </div>
    </div>
  );
}

