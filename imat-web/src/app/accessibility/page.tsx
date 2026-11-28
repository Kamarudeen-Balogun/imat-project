import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Accessibility · IMAT FUTA",
  description: "IMAT FUTA's commitment to making this website usable by everyone.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      intro="IMAT FUTA wants everyone on campus to be able to report an issue and follow up on it, regardless of ability or device."
    >
      <section>
        <h2>Our commitment</h2>
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 level AA: readable contrast,
          keyboard-navigable pages, descriptive labels on forms and buttons, and layouts that work at phone
          width as well as on desktop.
        </p>
      </section>
      <section>
        <h2>Known limits</h2>
        <p>
          Some charts and photo evidence are visual by nature. Where a chart carries key information, the
          surrounding page text summarises it. We are still improving older pages and welcome reports of
          anything that is hard to use.
        </p>
      </section>
      <section>
        <h2>Report a barrier</h2>
        <p>
          If you cannot use part of this site — for example text that is hard to read, a control you cannot
          reach by keyboard, or a form that does not work with your screen reader — tell us through the
          contact form on the About page and describe the page and the problem. We will look into it.
        </p>
      </section>
    </LegalPage>
  );
}
