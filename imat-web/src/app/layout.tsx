import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const ibmPlexSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app"),
  title: "IMAT · Infrastructure Maintenance Awareness Team",
  description: "FUTA Civil Engineering Infrastructure Maintenance Awareness Team",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? {
          "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION,
        }
      : undefined,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "IMAT · Infrastructure Maintenance Awareness Team",
    description: "Track, report, and advocate for better campus infrastructure at FUTA.",
    url: "/",
    siteName: "IMAT FUTA",
    type: "website",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
        alt: "IMAT FUTA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IMAT · Infrastructure Maintenance Awareness Team",
    description: "Track, report, and advocate for better campus infrastructure at FUTA.",
    images: ["/images/logo.png"],
  },
  icons: {
    icon: "/icon.png?v=20260425-1",
    shortcut: "/icon.png?v=20260425-1",
    apple: "/apple-icon.png?v=20260425-1",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import ClientToaster from "@/components/ClientToaster";
import { SiteShell } from "@/components/layout/SiteShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imat-futa.vercel.app";

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IMAT FUTA",
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    description: "Infrastructure Maintenance Awareness Team, FUTA.",
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "IMAT FUTA",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/newsroom?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased text-textDefault flex min-h-screen flex-col transition-colors duration-300`}>
        <Analytics />
        <SpeedInsights />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ThemeProvider defaultTheme="light">
          <SiteShell>{children}</SiteShell>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
