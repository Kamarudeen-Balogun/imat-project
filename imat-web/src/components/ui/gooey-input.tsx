"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GooeyInputProps = {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
};

export function GooeyInput({
  placeholder = "Search...",
  className,
  value,
  onChange,
  onSearch,
}: GooeyInputProps) {
  const [internalValue, setInternalValue] = useState("");

  const resolvedValue = value ?? internalValue;

  useEffect(() => {
    if (typeof value === "string") {
      setInternalValue(value);
    }
  }, [value]);

  const showClear = useMemo(() => resolvedValue.trim().length > 0, [resolvedValue]);

  const updateValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const triggerSearch = () => {
    onSearch?.(resolvedValue.trim());
  };

  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <div className="relative flex h-12 items-center gap-2 overflow-hidden rounded-xl border border-borderDark bg-surfaceStrong px-3">
        <button
          type="button"
          onClick={triggerSearch}
          className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-text2 transition-colors hover:text-primary"
          aria-label="Search"
        >
          <Search size={16} />
        </button>

        <input
          value={resolvedValue}
          onChange={(event) => updateValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              triggerSearch();
            }
            if (event.key === "Escape") {
              updateValue("");
            }
          }}
          placeholder={placeholder}
          className="relative z-10 h-full w-full bg-transparent text-sm text-textDefault placeholder:text-text3 focus:outline-none"
        />

        {showClear && (
          <button
            type="button"
            onClick={() => {
              updateValue("");
              onSearch?.("");
            }}
            className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-text3 transition-colors hover:text-textDefault"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
