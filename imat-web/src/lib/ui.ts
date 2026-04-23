import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const buttonStyles = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50",
  sizes: {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
    xl: "px-6 py-3 text-base",
  },
  variants: {
    primary: "bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary btn-press",
    secondary: "border border-borderLit bg-bg2/80 text-textDefault hover:border-primary/50 hover:text-primary focus-visible:ring-primary btn-press",
    ghost: "text-text2 hover:text-textDefault hover:bg-primary/10 focus-visible:ring-primary btn-press",
    accent: "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25 focus-visible:ring-accent btn-press",
    success: "bg-success text-white hover:bg-success/90 shadow-lg shadow-success/25 focus-visible:ring-success btn-press",
    danger: "bg-danger text-white hover:bg-danger/90 shadow-lg shadow-danger/25 focus-visible:ring-danger btn-press",
    outline: "border-2 border-borderDark text-textDefault hover:border-primary hover:text-primary focus-visible:ring-primary btn-press",
  },
};

export const cardStyles = {
  base: "glass-panel rounded-2xl p-5 transition-all duration-200",
  hover: "hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg",
  interactive: "hover:ring-2 hover:ring-primary/30 cursor-pointer",
};

export const inputStyles = {
  base: "w-full rounded-xl border border-borderDark/70 bg-surface px-4 py-2.5 text-textDefault placeholder:text-text3 transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
  error: "border-danger focus:border-danger focus:ring-danger/30",
  success: "border-success focus:border-success focus:ring-success/30",
};

export const badgeStyles = {
  base: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
  variants: {
    default: "bg-bg2 border border-borderDark text-text2",
    primary: "bg-primary/15 border border-primary/30 text-primary",
    accent: "bg-accent/15 border border-accent/30 text-accent",
    success: "bg-success/15 border border-success/30 text-success",
    danger: "bg-danger/15 border border-danger/30 text-danger",
    warning: "bg-warning/15 border border-warning/30 text-warning",
  },
};

export const skeletonStyles = {
  base: "skeleton-shimmer rounded-lg",
  text: "h-4 w-full",
  title: "h-6 w-3/4",
  avatar: "h-10 w-10 rounded-full",
  image: "h-48 w-full rounded-xl",
  card: "h-32 w-full rounded-xl",
};

export const sectionHeading = {
  label: "text-xs font-mono uppercase tracking-[0.18em] text-text3",
  title: "text-2xl font-bold text-textDefault",
  subtitle: "text-sm text-text2",
};

export const statCard = {
  base: "glass-panel rounded-2xl p-5",
  icon: "mb-3 h-8 w-8 text-primary",
  value: "text-3xl font-bold text-textDefault",
  label: "mt-1 text-xs uppercase tracking-[0.14em] text-text3",
};