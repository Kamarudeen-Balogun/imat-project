"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { logActivityEvent } from "@/lib/activity/logEvent";
import { createAnnouncementSlug, getAnnouncementHref } from "@/lib/news";
import { sanitizeMarkdown, sanitizePlainText, sanitizeUrl } from "@/lib/inputSanitizer";
import { markdownToPlainText } from "@/lib/markdown";
import { parseVideoUrl } from "@/lib/video";
import { ANNOUNCEMENT_TOPICS } from "@/lib/announcements";
import ArticleBody from "@/components/news/ArticleBody";
import Image from "next/image";
import {
  Bold,
  Eye,
  FileText,
  Globe,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Lock,
  Mail,
  PenLine,
  Play,
  Quote,
  Save,
  Send,
  Video,
} from "lucide-react";
import { toast } from "react-hot-toast";

const SAMPLE_OUTLINE = `## What happened

## What this means for students

> 

## What's next
`;

type Tab = "write" | "preview" | "email";

// Upload with real progress (fetch cannot report upload progress).
function uploadToCloudinary(file: File, onProgress: (pct: number) => void): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_ANNOUNCEMENTS;

  if (!cloudName || !uploadPreset) {
    return Promise.reject(new Error("Cloudinary announcement upload settings are missing."));
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const url = (JSON.parse(xhr.responseText).secure_url as string) ?? "";
          if (url) resolve(url);
          else reject(new Error("Image upload failed."));
        } catch {
          reject(new Error("Image upload failed."));
        }
      } else {
        reject(new Error(`Image upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Image upload failed."));
    xhr.send(formData);
  });
}

export default function CampaignForm({ userId, authorName }: { userId: string; authorName: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<string>("General");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members_only">("public");
  const [videoInput, setVideoInput] = useState("");

  const [coverUrl, setCoverUrl] = useState("");
  const [coverFileName, setCoverFileName] = useState("");
  const [coverLocalPreview, setCoverLocalPreview] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);

  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("write");

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const inlineImageInputRef = useRef<HTMLInputElement | null>(null);

  const video = useMemo(() => parseVideoUrl(videoInput), [videoInput]);
  const videoInvalid = videoInput.trim().length > 0 && !video;
  const effectiveExcerpt = excerpt.trim() || markdownToPlainText(body).slice(0, 200);
  const coverPreview = coverLocalPreview || coverUrl;

  useEffect(() => {
    return () => {
      if (coverLocalPreview.startsWith("blob:")) URL.revokeObjectURL(coverLocalPreview);
    };
  }, [coverLocalPreview]);

  const insertAtCursor = (before: string, after = "", placeholder = "") => {
    const el = bodyRef.current;
    if (!el) {
      setBody((prev) => `${prev}${before}${placeholder}${after}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const selected = body.slice(start, end) || placeholder;
    const next = `${body.slice(0, start)}${before}${selected}${after}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleCoverSelect = async (file: File | null) => {
    if (!file) return;
    setCoverFileName(file.name);
    const objectUrl = URL.createObjectURL(file);
    setCoverLocalPreview(objectUrl);
    setCoverProgress(0);
    setIsUploadingCover(true);
    try {
      const uploaded = await uploadToCloudinary(file, setCoverProgress);
      setCoverUrl(uploaded);
      setCoverLocalPreview("");
    } catch {
      toast.error("Cover upload failed. Check the Cloudinary preset or try again.");
      setCoverLocalPreview("");
      setCoverFileName("");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleInlineImageSelect = async (file: File | null) => {
    if (!file) return;
    setIsUploadingInline(true);
    try {
      const uploaded = await uploadToCloudinary(file, () => {});
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "News image";
      insertAtCursor(`\n![${alt}](${uploaded})\n`, "", "");
      toast.success("Image added to the post.");
    } catch {
      toast.error("Image upload failed. Check the Cloudinary preset or try again.");
    } finally {
      setIsUploadingInline(false);
    }
  };

  const save = async (asDraft: boolean) => {
    const safeTitle = sanitizePlainText(title, 120);
    const safeTopic = ANNOUNCEMENT_TOPICS.includes(topic as (typeof ANNOUNCEMENT_TOPICS)[number]) ? topic : "General";
    const safeExcerpt = sanitizePlainText(excerpt, 200);
    const safeBody = sanitizeMarkdown(body, 20000);
    const safeCoverUrl = sanitizeUrl(coverUrl.trim());
    const safeVideoUrl = video ? video.watchUrl : "";

    if (!safeTitle || !safeBody) {
      toast.error("Headline and body are required");
      return;
    }
    if (videoInvalid) {
      toast.error("That video link is not a YouTube or Vimeo URL.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseClient();
    const slug = createAnnouncementSlug(safeTitle);
    const now = new Date().toISOString();

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({
        title: safeTitle,
        body: safeBody,
        slug,
        visibility,
        author_id: userId,
        topic: safeTopic,
        excerpt: safeExcerpt || null,
        status: asDraft ? "draft" : "published",
        published_at: asDraft ? null : now,
        image_url: safeCoverUrl || null,
        video_url: safeVideoUrl || null,
      })
      .select("id, slug")
      .single();

    if (error || !announcement) {
      console.error("Broadcast save failed.", error);
      toast.error(asDraft ? "Failed to save draft." : "Failed to publish broadcast.");
      setIsSubmitting(false);
      return;
    }

    if (asDraft) {
      await logActivityEvent(supabase, {
        eventType: "announcement_drafted",
        entityType: "announcement",
        entityId: announcement.id,
        title: `Saved broadcast draft: ${safeTitle}`,
        actorId: userId,
        details: { visibility, topic: safeTopic },
        isRelevant: true,
      });
      toast.success("Draft saved. Publish it from the news manager when ready.");
      router.push("/dashboard/news");
      router.refresh();
      return;
    }

    const recipientsQuery = supabase
      .from("users")
      .select("id")
      .eq("status", "active")
      .eq("notifications_enabled", true);

    const { data: recipients } =
      visibility === "members_only"
        ? await recipientsQuery.neq("role", "applicant")
        : await recipientsQuery;

    if (recipients && recipients.length > 0) {
      const notificationRows = recipients.map((recipient) => ({
        recipient_id: recipient.id,
        created_by: userId,
        announcement_id: announcement.id,
        type: "news_update",
        title: safeTitle,
        body: markdownToPlainText(safeBody).slice(0, 180) || safeTitle,
        href: getAnnouncementHref(announcement.slug ?? slug),
      }));

      const { error: notificationError } = await supabase.from("notifications").insert(notificationRows);
      if (notificationError) console.warn("Notification fan-out failed.");
    }

    try {
      const pushResponse = await fetch("/api/announcements/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      if (!pushResponse.ok) console.warn("Push delivery failed.", await pushResponse.text().catch(() => ""));
    } catch (error) {
      console.warn("Push delivery failed.", error);
    }

    try {
      const emailResponse = await fetch("/api/announcements/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: announcement.id }),
      });
      if (!emailResponse.ok) console.warn("Announcement email delivery failed.", await emailResponse.text().catch(() => ""));
    } catch (error) {
      console.warn("Announcement email delivery failed.", error);
    }

    await logActivityEvent(supabase, {
      eventType: "announcement_published",
      entityType: "announcement",
      entityId: announcement.id,
      title: `Published broadcast: ${safeTitle}`,
      actorId: userId,
      details: { visibility, topic: safeTopic, hasImage: Boolean(safeCoverUrl), hasVideo: Boolean(safeVideoUrl) },
      isRelevant: true,
    });

    toast.success("Broadcast published!");
    router.push(visibility === "public" ? "/newsroom" : "/dashboard");
    router.refresh();
  };

  const busy = isSubmitting || isUploadingCover || isUploadingInline;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const toolbarButton =
    "inline-flex items-center gap-1 rounded-lg border border-soft bg-bg px-2.5 py-1.5 text-xs font-semibold text-text2 hover:border-primary hover:text-primary transition-colors";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-soft bg-bg2 p-1.5" role="tablist" aria-label="Composer views">
        {(
          [
            { id: "write", label: "Write", icon: PenLine },
            { id: "preview", label: "Preview post", icon: Eye },
            { id: "email", label: "Preview email", icon: Mail },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === id ? "bg-primary text-white shadow" : "text-text3 hover:text-textDefault"
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {activeTab === "write" && (
        <div className="space-y-6">
          {/* Headline + topic */}
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <label htmlFor="broadcast-title" className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-text3">
                Headline
              </label>
              <input
                id="broadcast-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. FUTA holds 36th convocation ceremony"
                className="field text-lg font-semibold"
                maxLength={120}
                required
              />
              <p className="mt-1 text-right text-xs text-text3">{title.length}/120</p>
            </div>
            <div>
              <label htmlFor="broadcast-topic" className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-text3">
                Topic
              </label>
              <select
                id="broadcast-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="field"
              >
                {ANNOUNCEMENT_TOPICS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="broadcast-excerpt" className="mb-1.5 block text-xs font-mono uppercase tracking-wider text-text3">
              Standfirst — the short intro under the headline
            </label>
            <textarea
              id="broadcast-excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences that sum up the story. Shown on the post, the newsroom card and the email."
              className="field min-h-[72px] resize-y"
              maxLength={200}
            />
            <p className="mt-1 text-right text-xs text-text3">
              {excerpt.length}/200{excerpt.length === 0 ? " — leave blank to use the first lines of the body" : ""}
            </p>
          </div>

          {/* Body + toolbar */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="broadcast-body" className="text-xs font-mono uppercase tracking-wider text-text3">
                Story body
              </label>
              <button
                type="button"
                onClick={() => setBody((prev) => (prev.trim() ? `${prev.trim()}\n\n${SAMPLE_OUTLINE}` : SAMPLE_OUTLINE))}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Insert outline
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-soft bg-bg">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-soft bg-bg2 px-2 py-2">
                <button type="button" onClick={() => insertAtCursor("\n## ", "", "Section heading")} className={toolbarButton} title="Heading">
                  <Heading2 size={14} /> H2
                </button>
                <button type="button" onClick={() => insertAtCursor("\n### ", "", "Sub-heading")} className={toolbarButton} title="Sub-heading">
                  <Heading3 size={14} /> H3
                </button>
                <span className="mx-1 hidden h-5 w-px bg-borderDark sm:block" />
                <button type="button" onClick={() => insertAtCursor("**", "**", "bold text")} className={toolbarButton} title="Bold">
                  <Bold size={14} />
                </button>
                <button type="button" onClick={() => insertAtCursor("*", "*", "italic text")} className={toolbarButton} title="Italic">
                  <Italic size={14} />
                </button>
                <button type="button" onClick={() => insertAtCursor("\n- ", "", "List item")} className={toolbarButton} title="Bullet list">
                  <List size={14} />
                </button>
                <button type="button" onClick={() => insertAtCursor("\n1. ", "", "List item")} className={toolbarButton} title="Numbered list">
                  <ListOrdered size={14} />
                </button>
                <button type="button" onClick={() => insertAtCursor("\n> ", "", "Quote")} className={toolbarButton} title="Quote">
                  <Quote size={14} />
                </button>
                <button type="button" onClick={() => insertAtCursor("[", "](https://)", "link text")} className={toolbarButton} title="Link">
                  <Link2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  className={toolbarButton}
                  title="Add an image inside the story"
                  disabled={isUploadingInline}
                >
                  {isUploadingInline ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />} Image
                </button>
                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    void handleInlineImageSelect(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
              <textarea
                ref={bodyRef}
                id="broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Write the story here. Use the toolbar for headings, lists and quotes, and put a blank line between paragraphs.\n\n## What happened\n\nThe ceremony held on Saturday..."}
                className="min-h-[320px] w-full resize-y bg-bg px-4 py-3 text-textDefault placeholder-text3 focus:outline-none"
                required
              />
            </div>
            <p className="mt-1.5 text-xs text-text3">
              Formatting: ## heading, **bold**, *italic*, - list, 1. numbered list, &gt; quote, [text](https://…) link, ![caption](image url) image.
            </p>
          </div>

          {/* Cover image */}
          <div className="space-y-3 rounded-2xl border border-soft bg-bg p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-mono uppercase tracking-wider text-text3">Cover image</span>
              {(coverUrl || coverFileName) && (
                <button
                  type="button"
                  onClick={() => {
                    setCoverUrl("");
                    setCoverFileName("");
                    setCoverLocalPreview("");
                  }}
                  className="text-xs text-text3 hover:text-textDefault transition-colors"
                >
                  Remove image
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-soft bg-bg2 px-4 py-5 text-sm text-text3 hover:border-primary hover:text-primary transition-colors">
                  <ImageIcon size={16} />
                  <span>{isUploadingCover ? `Uploading… ${coverProgress}%` : coverFileName || "Choose a cover image"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      void handleCoverSelect(e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {isUploadingCover && (
                  <div className="h-2 overflow-hidden rounded-full bg-bg3">
                    <div className="h-full bg-primary transition-all" style={{ width: `${coverProgress}%` }} />
                  </div>
                )}
                <div>
                  <label htmlFor="broadcast-cover-url" className="mb-2 block text-xs font-mono uppercase tracking-wider text-text3">
                    Or paste an image URL
                  </label>
                  <input
                    id="broadcast-cover-url"
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="field"
                  />
                </div>
              </div>
              <div className="min-h-[180px] overflow-hidden rounded-xl border border-soft bg-bg2">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center px-6 text-center text-sm text-text3">
                    No cover image yet. This is the big image at the top of the post and the newsroom card.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="space-y-3 rounded-2xl border border-soft bg-bg p-4 sm:p-5">
            <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text3">
              <Video size={14} /> Video — YouTube or Vimeo link
            </span>
            <input
              type="url"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=..."
              className="field"
            />
            {videoInvalid && (
              <p className="text-sm text-danger">That link is not a YouTube or Vimeo video URL.</p>
            )}
            {video && (
              <div className="overflow-hidden rounded-xl border border-soft bg-black">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={video.embedUrl}
                    title="Video preview"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <p className="bg-bg px-4 py-2 text-xs text-text3">
                  {video.provider === "youtube" ? "YouTube" : "Vimeo"} video — plays here on the post, and appears as a thumbnail with a play link in the email.
                </p>
              </div>
            )}
            {!video && !videoInvalid && (
              <p className="text-sm text-text3">Optional. Paste the link to the official video and it plays right inside the post.</p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <span className="mb-3 block text-xs font-mono uppercase tracking-wider text-text3">Visibility &amp; distribution</span>
            <div className="flex flex-col gap-4 sm:flex-row">
              <label className={`flex flex-1 cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-all ${visibility === "public" ? "border-primary bg-primary/10 ring-1 ring-primary/50" : "border-soft bg-bg hover:border-text3"}`}>
                <input type="radio" name="visibility" value="public" className="sr-only" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                <Globe className={`mr-1 shrink-0 ${visibility === "public" ? "text-primary" : "text-text3"}`} />
                <div>
                  <div className={`font-bold ${visibility === "public" ? "text-primary" : "text-textDefault"}`}>Public Website (/newsroom)</div>
                  <div className="mt-1 text-xs text-text3">Visible to all FUTA students, staff, and public visitors.</div>
                </div>
              </label>
              <label className={`flex flex-1 cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-all ${visibility === "members_only" ? "border-warning bg-warning/10 ring-1 ring-warning/50" : "border-soft bg-bg hover:border-text3"}`}>
                <input type="radio" name="visibility" value="members_only" className="sr-only" checked={visibility === "members_only"} onChange={() => setVisibility("members_only")} />
                <Lock className={`mr-1 shrink-0 ${visibility === "members_only" ? "text-warning" : "text-text3"}`} />
                <div>
                  <div className={`font-bold ${visibility === "members_only" ? "text-warning" : "text-textDefault"}`}>Internal Only</div>
                  <div className="mt-1 text-xs text-text3">Only IMAT members logged into the portal can read this.</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <div className="overflow-hidden rounded-2xl border border-soft bg-bg">
          <div className="border-b border-soft bg-bg2 px-5 py-3">
            <p className="text-xs font-mono uppercase tracking-wider text-text3">Newsroom preview — exactly how the post will read</p>
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-borderLit/40 bg-bg shadow-sm">
                <Image src="/images/logo.png" alt="IMAT logo" width={24} height={24} className="h-6 w-6 object-contain" />
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-text3">IMAT FUTA · Newsroom</span>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-primary sm:text-xs">
                {visibility === "public" ? "Public Broadcast" : "Members Only"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-accent sm:text-xs">
                {topic}
              </div>
            </div>
            <h1 className="mb-5 text-2xl font-bold leading-tight text-textDefault sm:text-4xl">
              {title || "Your headline will appear here"}
            </h1>
            {effectiveExcerpt && (
              <p className="mb-5 text-base leading-relaxed text-text2 sm:text-lg">{effectiveExcerpt}</p>
            )}
            <div className="flex flex-col gap-3 border-y border-borderDark py-3 text-xs font-mono text-text3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:py-4 sm:text-sm">
              <span>{today}</span>
              <span>By {authorName}</span>
            </div>
            {coverPreview && (
              <div className="mt-6 overflow-hidden rounded-xl border border-borderDark bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt={title || "Cover"} className="h-auto max-h-[52vh] w-full object-cover" />
              </div>
            )}
            {video && (
              <div className="mt-6 overflow-hidden rounded-xl border border-borderDark bg-black">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={video.embedUrl}
                    title="Video preview"
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            <div className="mt-8">
              {body.trim() ? (
                <ArticleBody markdown={body} />
              ) : (
                <p className="text-text3">Your story preview will appear here.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "email" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-soft bg-bg2 px-4 py-3 text-sm text-text2">
            <span className="font-semibold text-textDefault">Subject: </span>
            IMAT News: {title || "Your headline"}
          </div>
          <div className="mx-auto max-w-[560px] overflow-hidden rounded-lg border border-soft bg-white text-[#1a1a1a] shadow-sm">
            <div className="bg-[#0f5132] px-6 py-5 text-white">
              <div className="text-xl font-bold tracking-wide">IMAT</div>
              <div className="text-[13px] opacity-85">Infrastructure Maintenance Awareness Team · FUTA</div>
            </div>
            <div className="px-6 py-5">
              <h2 className="mb-2 text-xl font-bold leading-snug">{title || "Your headline"}</h2>
              <p className="mb-4 text-[13px] text-[#666]">Published by {authorName} · IMAT Newsroom</p>
              {coverPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt={title || "Cover"} className="mb-4 h-auto w-full rounded-lg object-cover" />
              )}
              <p className="mb-4 leading-relaxed">{effectiveExcerpt || "Your standfirst will appear here."}</p>
              {video && (
                <div className="mb-4 overflow-hidden rounded-lg border border-[#ddd]">
                  {video.thumbnailUrl ? (
                    <a href={video.watchUrl} target="_blank" rel="noopener noreferrer" className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={video.thumbnailUrl} alt="Watch the video" className="block w-full" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">
                          <Play size={20} />
                        </span>
                      </span>
                    </a>
                  ) : (
                    <a href={video.watchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-[#111820] px-4 py-4 text-white no-underline">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                        <Play size={18} />
                      </span>
                      <span className="text-sm font-semibold">Watch the video on Vimeo</span>
                    </a>
                  )}
                </div>
              )}
              <div className="mb-4">
                <span className="inline-block rounded-md bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white">Read the full post</span>
              </div>
              <p className="text-[13px] text-[#666]">Members receive this email when the broadcast is published.</p>
            </div>
            <div className="border-t border-[#eee] px-6 py-4 text-center text-xs text-[#999]">
              IMAT FUTA · Infrastructure Maintenance Awareness Team
            </div>
          </div>
          <details className="rounded-xl border border-soft bg-bg2 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-textDefault">Plain-text version</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-text2">
              {`${title || "Your headline"}\nPublished by ${authorName} · IMAT Newsroom\n\n${effectiveExcerpt || ""}${video ? `\n\nWatch the video: ${video.watchUrl}` : ""}\n\nRead the full post on the IMAT newsroom.`}
            </pre>
          </details>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 border-t border-soft pt-6 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={busy}
          className="btn btn-outline inline-flex items-center justify-center gap-2 px-6 py-3"
        >
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save as draft
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-center text-text3 hover:text-textDefault font-medium transition-colors"
          disabled={busy}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={busy}
          className="btn btn-primary inline-flex items-center justify-center gap-2 px-8 py-3"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {isUploadingCover ? "Uploading image…" : isSubmitting ? "Publishing…" : "Publish Broadcast"}
        </button>
      </div>
      <p className="flex items-start gap-2 text-xs text-text3">
        <FileText size={14} className="mt-0.5 shrink-0" />
        Publishing notifies members in-app, sends the announcement email and posts to the newsroom. A draft stays private until you publish it from the news manager.
      </p>
    </div>
  );
}
