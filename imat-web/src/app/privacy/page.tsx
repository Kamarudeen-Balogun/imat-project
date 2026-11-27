import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy · IMAT FUTA",
  description: "How IMAT FUTA collects, uses and protects your information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="The Infrastructure Maintenance Awareness Team (IMAT), FUTA, collects only the information it needs to run membership and campus infrastructure reporting."
    >
      <section>
        <h2>What we collect</h2>
        <p>
          Membership applications (name, matric number, level, email, phone and your stated preferences),
          defect reports (description, category, severity, location and photos you choose to upload),
          contact messages, and volunteer hours you log. Member accounts also store your role and profile details.
        </p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>
          Applications are reviewed by the IMAT recruitment board. Defect reports are routed to the technical
          team and, where needed, the Works &amp; Physical Planning Department. Contact messages are answered by
          the team. We do not sell, rent or share your personal information with advertisers or third parties.
        </p>
      </section>
      <section>
        <h2>Public visibility</h2>
        <p>
          Public defect reports show the issue details you submitted. Internal severity metrics, officer
          assignments and your contact details are never shown publicly.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can ask for your personal information to be corrected or removed by contacting the team through
          the contact form on the About page. Removing a member account also removes that member&apos;s access
          to the member portal.
        </p>
      </section>
    </LegalPage>
  );
}
