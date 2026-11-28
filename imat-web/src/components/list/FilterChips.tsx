"use client";

export type FilterChip = {
  id: string;
  label: string;
  count: number;
};

/**
 * Shared category chips: horizontally scrollable on phones, wrapping on
 * desktop. The active chip uses the site teal; every chip is >=40px tall.
 * Counts come from the list being filtered (they update with search).
 */
export default function FilterChips({
  chips,
  activeId,
  onChange,
  ariaLabel,
}: {
  chips: FilterChip[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {chips.map((chip) => {
        const isActive = activeId === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(chip.id)}
            className={`inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-primary ${
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-soft bg-bg text-text2 hover:border-primary hover:text-primary"
            }`}
          >
            {chip.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[11px] font-mono font-bold leading-none ${
                isActive ? "bg-primary/15 text-primary" : "bg-bg3 text-text3"
              }`}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
