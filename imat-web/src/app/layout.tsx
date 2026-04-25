import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "IMAT · Infrastructure Maintenance Awareness Team",
  description: "FUTA Civil Engineering Infrastructure Maintenance Awareness Team",
  icons: {
    icon: "/icon.png?v=20260425-1",
    shortcut: "/icon.png?v=20260425-1",
    apple: "/apple-icon.png?v=20260425-1",
  },
};

export const viewport: Viewport = {
  themeColor: "#29abff",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import ClientToaster from "@/components/ClientToaster";
import { SiteShell } from "@/components/layout/SiteShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased text-textDefault flex min-h-screen flex-col transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SiteShell>{children}</SiteShell>
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
