import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Use · IMAT FUTA",
  description: "The terms for using the IMAT FUTA website and member portal.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="By using the IMAT FUTA website you agree to these terms. They exist to keep campus reporting honest and the platform safe for everyone."
    >
      <section>
        <h2>Accurate reports</h2>
        <p>
          Submit defect reports that are truthful and based on what you observed on campus. False, misleading
          or duplicate reports may be removed, and accounts used to submit them may lose access.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not use the site to spam, harass, impersonate another person, or upload content you do not have
          the right to share. Automated scraping or attempts to bypass the site&apos;s security checks are not allowed.
        </p>
      </section>
      <section>
        <h2>Membership</h2>
        <p>
          Membership is by application and approval by the IMAT board. Membership, roles and access to the
          member portal may be changed or removed by the team in line with the team&apos;s internal rules.
        </p>
      </section>
      <section>
        <h2>Content</h2>
        <p>
          Reports, photos and other material you submit may be used by IMAT for infrastructure advocacy,
          reporting to the university, and public awareness, without identifying you personally.
        </p>
      </section>
      <section>
        <h2>Availability</h2>
        <p>
          The site is provided as-is for the benefit of the FUTA community. IMAT may change, suspend or
          discontinue any part of it at any time.
        </p>
      </section>
    </LegalPage>
  );
}
