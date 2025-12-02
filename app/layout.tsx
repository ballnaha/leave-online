import type { Metadata } from "next";
import AppProviders from "./providers/AppProviders";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#667eea" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
        </AppProviders>
      </body>
    </html>
  );
}
