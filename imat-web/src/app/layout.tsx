import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "IMAT · Infrastructure Maintenance Awareness Team",
  description: "FUTA Civil Engineering Infrastructure Maintenance Awareness Team",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IMAT Portal",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} font-sans antialiased text-textDefault flex flex-col min-h-screen bg-bg transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          <Toaster 
            position="bottom-center"
            toastOptions={{
              className: 'bg-bg2 text-textDefault border border-borderDark font-mono text-sm',
              duration: 4000,
              style: {
                background: 'var(--color-bg2)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border-dark)',
                borderRadius: '8px',
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
