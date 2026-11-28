import type { Metadata } from "next";

// Sign-in page: usable by members, but it must not be indexed or previewed.
export const metadata: Metadata = {
  title: "Member Portal · IMAT FUTA",
  description: "Sign in to the IMAT FUTA member portal.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
