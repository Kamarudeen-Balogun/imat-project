"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { createAnnouncementSlug, getAnnouncementHref } from "@/lib/news";
import { sanitizePlainText, sanitizeUrl } from "@/lib/inputSanitizer";
import Image from "next/image";
import { Send, Loader2, Globe, Lock, Image as ImageIcon, Eye, X } from "lucide-react";
import { toast } from "react-hot-toast";

type PreviewState = {
  title: string;
  body: string;
  visibility: "public" | "members_only";
  imageUrl: string;
};

export default function CampaignForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members_only">("public");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const previewData = useMemo<PreviewState>(() => ({
    title,
    body,
    visibility,
    imageUrl: imagePreview || imageUrl,
  }), [title, body, visibility, imagePreview, imageUrl]);

  const renderPreviewImage = (url: string, alt: string, className: string) => {
    if (!url) return null;

    if (url.startsWith("blob:")) {
      // Blob previews are local-only and cannot be optimized by next/image.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt={alt} className={className} />;
    }

    return (
      <Image
        src={url}
        alt={alt}
        width={1600}
        height={900}
        className={className}
        sizes="(max-width: 768px) 100vw, 50vw"
      />
    );
  };

  const uploadImage = async (): Promise<string> => {
    if (!selectedImage) return imageUrl.trim();

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary announcement upload settings are missing.");
    }

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedImage);
      formData.append("upload_preset", uploadPreset);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.text().catch(() => "");
        throw new Error(`Image upload failed (${response.status}): ${payload || "No response body"}`);
      }

      const data = await response.json();
      return data.secure_url as string;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeTitle = sanitizePlainText(title, 120);
    const safeBody = sanitizePlainText(body, 6000);
    const safeImageUrl = sanitizeUrl(imageUrl.trim());

    if (!safeTitle || !safeBody) {
      toast.error("Title and body are required");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseClient();
    let uploadedImageUrl = safeImageUrl;

    if (selectedImage) {
      try {
        uploadedImageUrl = await uploadImage();
      } catch {
        console.error("Broadcast image upload failed.");
        toast.error("Image upload failed. Check Cloudinary preset/CSP settings or try again.");
        setIsSubmitting(false);
        return;
      }
    }

    const slug = createAnnouncementSlug(safeTitle);

    const { data: announcement, error } = await supabase.from("announcements").insert({
      title: safeTitle,
      body: safeBody,
      slug,
      visibility,
      author_id: userId,
      published_at: new Date().toISOString(),
      image_url: uploadedImageUrl || null,
    }).select("id, slug").single();

    if (error) {
      console.error("Broadcast publish failed.");
      toast.error("Failed to publish broadcast. Check database permissions.");
      setIsSubmitting(false);
    } else {
      const recipientsQuery = supabase
        .from("users")
        .select("id")
        .eq("status", "active")
        .eq("notifications_enabled", true);

      const { data: recipients } = visibility === "members_only"
        ? await recipientsQuery.neq("role", "applicant")
        : await recipientsQuery;

      if (recipients && recipients.length > 0) {
        const notificationRows = recipients.map((recipient) => ({
          recipient_id: recipient.id,
          created_by: userId,
          announcement_id: announcement?.id ?? null,
          type: "news_update",
          title: safeTitle,
          body: safeBody.trim().replace(/\s+/g, " ").slice(0, 180) || safeTitle,
          href: getAnnouncementHref(announcement?.slug ?? slug),
        }));

        const { error: notificationError } = await supabase.from("notifications").insert(notificationRows);

        if (notificationError) {
          console.warn("Notification fan-out failed.");
        }
      }

      try {
        const pushResponse = await fetch("/api/announcements/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ announcementId: announcement?.id ?? null }),
        });

        if (!pushResponse.ok) {
          const payload = await pushResponse.text().catch(() => "");
          console.warn("Push delivery failed.", payload);
        }
      } catch (error) {
        console.warn("Push delivery failed.", error);
      }

      await logActivityEvent(supabase, {
        eventType: "announcement_published",
        entityType: "announcement",
        entityId: announcement?.id ?? null,
        title: `Published broadcast: ${safeTitle}`,
        actorId: userId,
        details: {
          visibility,
          hasImage: Boolean(uploadedImageUrl),
        },
        isRelevant: true,
      });

      toast.success("Broadcast published!");
      router.push(visibility === "public" ? "/newsroom" : "/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] gap-6 xl:gap-8 items-start">
      <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-text2 mb-1.5 font-mono uppercase tracking-wider">
          Headline
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. FUTA Library Renovation Starts Tomorrow..."
          className="w-full bg-bg border border-soft rounded-lg px-4 py-3 text-textDefault placeholder-text3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-medium text-lg"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text2 mb-1.5 font-mono uppercase tracking-wider">
          Broadcast Content
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the full announcement details here..."
          className="w-full bg-bg border border-soft rounded-lg px-4 py-3 text-textDefault placeholder-text3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors min-h-[250px] resize-y"
          required
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-soft bg-bg p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <label className="block text-sm font-medium text-text2 font-mono uppercase tracking-wider">
            Optional Cover Image
          </label>
          <button
            type="button"
            onClick={() => {
              setSelectedImage(null);
              setImageUrl("");
            }}
            className="text-xs text-text3 hover:text-textDefault transition-colors"
          >
            Clear image
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-soft bg-bg2 px-4 py-5 text-sm text-text3 hover:border-primary hover:text-primary transition-colors">
              <ImageIcon size={16} />
              <span>{selectedImage ? selectedImage.name : "Choose a news image"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
              />
            </label>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-text3 mb-2">
                Or paste an image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-soft bg-bg2 px-4 py-3 text-textDefault placeholder-text3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-soft bg-bg2 min-h-[180px]">
            {imagePreview || imageUrl ? (
              renderPreviewImage(imagePreview || imageUrl, "News cover preview", "h-full w-full object-cover")
            ) : (
              <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-text3">
                No image selected yet. This section previews the cover image that will appear in the newsroom.
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text2 mb-3 font-mono uppercase tracking-wider">
          Visibility & Distribution
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className={`flex-1 flex px-4 py-4 rounded-xl border cursor-pointer transition-all ${
            visibility === 'public' 
              ? 'border-primary bg-primary/10 ring-1 ring-primary/50' 
              : 'border-soft bg-bg hover:border-text3'
          }`}>
            <input 
              type="radio" 
              name="visibility" 
              value="public" 
              className="sr-only"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            <Globe className={`mr-4 shrink-0 ${visibility === 'public' ? 'text-primary' : 'text-text3'}`} />
            <div>
              <div className={`font-bold ${visibility === 'public' ? 'text-primary' : 'text-textDefault'}`}>Public Website (/newsroom)</div>
              <div className="text-xs text-text3 mt-1">Visible to all FUTA students, staff, and public visitors.</div>
            </div>
          </label>

          <label className={`flex-1 flex justify-start items-start px-4 py-4 rounded-xl border cursor-pointer transition-all ${
            visibility === 'members_only' 
              ? 'border-warning bg-warning/10 ring-1 ring-warning/50' 
              : 'border-soft bg-bg hover:border-text3'
          }`}>
            <input 
              type="radio" 
              name="visibility" 
              value="members_only" 
              className="sr-only"
              checked={visibility === "members_only"}
              onChange={() => setVisibility("members_only")}
            />
            <Lock className={`mr-4 shrink-0 ${visibility === 'members_only' ? 'text-warning' : 'text-text3'}`} />
            <div>
              <div className={`font-bold ${visibility === 'members_only' ? 'text-warning' : 'text-textDefault'}`}>Internal Only</div>
              <div className="text-xs text-text3 mt-1">Only IMAT members logged into the portal can read this.</div>
            </div>
          </label>
        </div>
      </div>

      <div className="pt-6 border-t border-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-6 py-3 rounded-lg border border-soft text-textDefault hover:border-primary hover:text-primary font-semibold transition-colors flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          <Eye size={18} /> Preview
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-text3 hover:text-textDefault font-medium transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isUploadingImage}
          className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isSubmitting || isUploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {isUploadingImage ? "Uploading image..." : isSubmitting ? "Publishing..." : "Publish Broadcast"}
        </button>
      </div>
      </form>

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 sm:p-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-soft bg-bg2 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-bg/80 p-2 text-text3 hover:text-textDefault hover:bg-bg transition-colors"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>

            <div className="max-h-[85vh] overflow-y-auto">
              <div className="border-b border-soft bg-bg px-5 sm:px-6 py-4">
                <p className="text-xs font-mono uppercase tracking-wider text-text3">Newsroom Preview</p>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="p-5 sm:p-6 lg:p-8 space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-soft bg-bg px-3 py-1 text-xs font-mono uppercase tracking-wider text-text3">
                    {previewData.visibility === "public" ? <Globe size={14} /> : <Lock size={14} />} {previewData.visibility === "public" ? "Public Broadcast" : "Members Only"}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-textDefault leading-tight">{previewData.title || "Your headline will appear here"}</h2>
                  <p className="text-text2 leading-relaxed whitespace-pre-wrap">{previewData.body || "Your announcement content preview will appear here."}</p>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-soft bg-bg p-5 sm:p-6">
                  <div className="overflow-hidden rounded-xl border border-soft bg-bg2">
                    {previewData.imageUrl ? (
                      renderPreviewImage(previewData.imageUrl, "Broadcast preview image", "h-56 w-full object-cover sm:h-72 lg:h-[24rem]")
                    ) : (
                      <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-text3 sm:h-72 lg:h-[24rem]">
                        No cover image selected.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-soft bg-bg2 p-4 text-sm text-text3">
                    This is how the broadcast card will read on the newsroom page. You can close this preview and keep editing before publishing.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

