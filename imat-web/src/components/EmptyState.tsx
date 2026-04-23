"use client";

import { motion } from "framer-motion";
import { FileX, Inbox, Users, Image, AlertCircle, FolderOpen } from "lucide-react";
import Link from "next/link";
import { fadeInUp } from "@/lib/animations";

type EmptyStateType = "default" | "users" | "images" | "defects" | "files" | "inbox";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  { icon: typeof Inbox; title: string; description: string }
> = {
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "This area is empty. Items will appear here once added.",
  },
  users: {
    icon: Users,
    title: "No team members",
    description: "Team members will appear here once they join.",
  },
  images: {
    icon: Image,
    title: "No media available",
    description: "Evidence gallery items will appear here.",
  },
  defects: {
    icon: AlertCircle,
    title: "No defects reported",
    description: "Infrastructure issues will appear here once reported.",
  },
  files: {
    icon: FileX,
    title: "No files found",
    description: "Upload files to see them listed here.",
  },
  inbox: {
    icon: Inbox,
    title: "All caught up",
    description: "You've seen all the latest updates.",
  },
};

export function EmptyState({
  type,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-borderLit bg-bg2/30 p-8 text-center ${className}`}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg3/50">
        <Icon className="h-8 w-8 text-text3" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-textDefault">
        {title ?? config.title}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-text2">
        {description ?? config.description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 btn-press"
        >
          {actionLabel}
        </Link>
      )}
    </motion.div>
  );
}

export function EmptyStateMinimal({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-borderLit bg-bg2/30 p-6 text-center ${className}`}
    >
      <FolderOpen className="mb-2 h-6 w-6 text-text3" />
      <p className="text-xs text-text3">No items</p>
    </div>
  );
}

export function LoadingSkeleton({
  variant = "card",
  className,
}: {
  variant?: "text" | "title" | "card" | "avatar" | "image";
  className?: string;
}) {
  const heights: Record<string, string> = {
    text: "h-4",
    title: "h-6",
    card: "h-32",
    avatar: "h-10 w-10 rounded-full",
    image: "h-48",
  };

  return (
    <div
      className={`skeleton-shimmer rounded-lg ${heights[variant]} ${className}`}
    />
  );
}