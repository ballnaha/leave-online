import type { Metadata } from "next";
import AppProviders from "./providers/AppProviders";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NextTopLoader from 'nextjs-toploader';
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          <NextTopLoader 
            color="#6C63FF"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #6C63FF,0 0 5px #6C63FF"
            zIndex={2001}
          />
          {children}
          <PWAInstallPrompt />
        </AppProviders>
      </body>
    </html>
  );
}
