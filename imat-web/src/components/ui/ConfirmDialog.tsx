"use client";

import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Yes, delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  busy = false,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-danger/30 bg-bg2 shadow-2xl shadow-black/40">
        <div className="border-b border-soft bg-gradient-to-r from-danger/15 via-danger/5 to-transparent p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 bg-danger/15 text-danger">
              <AlertTriangle size={18} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-soft text-text3 transition-colors hover:border-text3 hover:text-textDefault"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
          <h3 className="mt-4 text-lg font-bold text-textDefault">{title}</h3>
          <p className="mt-2 text-sm text-text2">{description}</p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 transition-colors hover:border-text3 hover:text-textDefault disabled:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg border border-danger/40 bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
