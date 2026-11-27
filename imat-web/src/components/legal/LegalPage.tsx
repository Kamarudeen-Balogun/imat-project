import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type LegalPageProps = {
  title: string;
  intro: string;
  children: ReactNode;
};

/** Shared shell for the minimal static legal pages. */
export function LegalPage({ title, intro, children }: LegalPageProps) {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-14 sm:px-6 md:py-20">
      <Breadcrumbs className="mb-8" />
      <h1 className="mb-3 text-3xl font-bold text-textDefault md:text-4xl">{title}</h1>
      <p className="mb-8 max-w-2xl text-text2">{intro}</p>
      <div className="space-y-6 text-sm leading-relaxed text-text2 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-textDefault">
        {children}
      </div>
      <p className="mt-10 border-t border-soft pt-6 text-xs text-text3">
        Last updated: 27 November 2026. Questions about this page? Reach the IMAT team through the contact form on the About page.
      </p>
    </div>
  );
}
