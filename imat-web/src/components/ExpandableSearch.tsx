"use client";

import { GooeyInput } from "@/components/ui/gooey-input";

interface ExpandableSearchProps {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (query: string) => void;
  onSearch?: (query: string) => void;
}

export function ExpandableSearch({
  className,
  placeholder = "Search...",
  value,
  onChange,
  onSearch,
}: ExpandableSearchProps) {
  return (
    <GooeyInput
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onSearch={onSearch ?? onChange}
    />
  );
}