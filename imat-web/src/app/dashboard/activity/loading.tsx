import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-sm text-text3">Loading…</p>
    </div>
  );
}
