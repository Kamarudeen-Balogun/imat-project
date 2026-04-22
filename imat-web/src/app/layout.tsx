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
    icon: "/images/imatlogo.png",
    shortcut: "/images/imatlogo.png",
    apple: "/images/imatlogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#29abff",
};

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientToaster from "@/components/ClientToaster";
import BrowserNewsNotifier from "@/components/notifications/BrowserNewsNotifier";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased text-textDefault flex min-h-screen flex-col transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <BrowserNewsNotifier />
          <Navbar />
          <main className="futuristic-grid relative flex-grow">
            {children}
          </main>
          <Footer />
          <ClientToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
