"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "framer-motion";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

  if (pathname.startsWith("/dashboard")) {
    breadcrumbs.push({ label: "Dashboard", href: "/dashboard" });

    const segmentLabels: Record<string, string> = {
      defects: "Defects",
      campaigns: "Campaigns",
      reports: "Reports",
      evidence: "Evidence",
      wiki: "Wiki",
      news: "News",
      profile: "Profile",
      activity: "Activity",
      directory: "Directory",
      new: "New",
      edit: "Edit",
    };

    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const label = segmentLabels[segment] ?? segment;

      if (!label.startsWith("[")) {
        breadcrumbs.push({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          href: `/dashboard/${pathSegments.slice(1, i + 1).join("/")}`,
        });
      }
    }
  } else if (items) {
    breadcrumbs.push(...items);
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1.5 text-sm ${className}`}
    >
      <ol className="flex items-center gap-1.5">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isHome = index === 0;
          const isCurrentPage = isLast && item.href === pathname;

          return (
            <li key={item.href ?? index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-text3" />
              )}
              {isCurrentPage ? (
                <span
                  aria-current="page"
                  className="font-semibold text-textDefault"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-text2 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {isHome && <Home className="h-3.5 w-3.5" />}
                  <span>{item.label}</span>
                </Link>
              ) : isLast ? (
                <span aria-current="page" className="font-semibold text-textDefault">{item.label}</span>
              ) : (
                <span className="text-text2">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div>
        <h1 className="text-2xl font-bold text-textDefault sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-text2">{description}</p>
        )}
      </div>
      {action && <div className="mt-2 sm:mt-0">{action}</div>}
    </motion.div>
  );
}