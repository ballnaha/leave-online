import type { Metadata, Viewport } from "next";
import AppProviders from "./providers/AppProviders";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#667eea",
};

export const metadata: Metadata = {
  title: "Leave Online",
  description: "Mobile first leave management application",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Leave Online",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ overscrollBehavior: 'none' }}>
      <head>
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/images/apple-touch-icon-167.png" />
      </head>
      <body className={`${sarabun.variable} pre-locale`} style={{ overscrollBehavior: 'none' }}>
        {/* Prevent language flicker and fade-in once locale applied */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { opacity: 1; transition: opacity 180ms ease; }
              body.pre-locale { opacity: 0; pointer-events: none; }
            `,
          }}
        />
        <AppProviders>
          {children}
          <PWAInstallPrompt />
        </AppProviders>
      </body>
    </html>
  );
}
