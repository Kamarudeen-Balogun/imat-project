import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookie Policy · IMAT FUTA",
  description: "What cookies and local storage IMAT FUTA uses, and why.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="This site uses a small number of cookies and browser storage entries, only to keep you signed in and remember your preferences."
    >
      <section>
        <h2>Sign-in session</h2>
        <p>
          When members sign in, a session cookie is stored so the member portal recognises them while they
          browse. Signing out clears it. Without it, the portal cannot keep you signed in.
        </p>
      </section>
      <section>
        <h2>Preferences</h2>
        <p>
          Your light/dark theme choice is saved in your browser&apos;s local storage so the site looks the
          same on your next visit. Clearing your browser data resets it to the default theme.
        </p>
      </section>
      <section>
        <h2>Analytics</h2>
        <p>
          We use privacy-friendly analytics to see which pages are visited and whether the site is performing
          well. These do not identify you personally and are not used for advertising.
        </p>
      </section>
      <section>
        <h2>Third parties</h2>
        <p>
          Embedded services on the site — such as the spam check on public forms and the photo uploader — may
          set their own cookies under their own policies. We do not run advertising cookies.
        </p>
      </section>
      <section>
        <h2>Your control</h2>
        <p>
          You can block or delete cookies in your browser settings. Blocking the session cookie will sign you
          out of the member portal and prevent signing in again until cookies are allowed.
        </p>
      </section>
    </LegalPage>
  );
}
