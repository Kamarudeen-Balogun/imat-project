"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

type DeleteAnnouncementButtonProps = {
  announcementId: string;
  title: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
};

export default function DeleteAnnouncementButton({ announcementId, title, deleteAction }: DeleteAnnouncementButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onConfirmDelete = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={deleteAction} className="hidden">
        <input type="hidden" name="announcement_id" value={announcementId} />
      </form>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-colors"
      >
        <Trash2 size={16} /> Delete
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete confirmation"
            onClick={() => setIsOpen(false)}
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
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-soft text-text3 hover:text-textDefault hover:border-text3 transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              <h3 className="mt-4 text-lg font-bold text-textDefault">Delete announcement?</h3>
              <p className="mt-2 text-sm text-text2">
                This will permanently remove <span className="font-semibold text-textDefault">{title}</span>.
                This action cannot be undone.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 p-5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-soft px-4 py-2 text-sm font-semibold text-text3 hover:border-text3 hover:text-textDefault transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="rounded-lg border border-danger/40 bg-danger px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

