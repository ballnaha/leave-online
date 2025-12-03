"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "../ThemeRegistry";
import { LocaleProvider } from "./LocaleProvider";
import { ToastrProvider } from "../components/Toastr";
import { UserProvider } from "./UserProvider";
import { OneSignalProvider } from "./OneSignalProvider";
import PWAProvider from "./PWAProvider";

export default function AppProviders({ children, initialLocale }: { children: React.ReactNode; initialLocale?: "th" | "en" | "my" }) {
  return (
    <SessionProvider>
      <PWAProvider>
        <UserProvider>
          <OneSignalProvider>
            <LocaleProvider initialLocale={initialLocale}>
              <ThemeRegistry>
                <ToastrProvider>{children}</ToastrProvider>
              </ThemeRegistry>
            </LocaleProvider>
          </OneSignalProvider>
        </UserProvider>
      </PWAProvider>
    </SessionProvider>
  );
}
