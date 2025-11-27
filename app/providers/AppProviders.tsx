"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "../ThemeRegistry";
import { LocaleProvider } from "./LocaleProvider";
import { ToastrProvider } from "../components/Toastr";
import { UserProvider } from "./UserProvider";

export default function AppProviders({ children, initialLocale }: { children: React.ReactNode; initialLocale?: "th" | "en" | "my" }) {
  return (
    <SessionProvider>
      <UserProvider>
        <LocaleProvider initialLocale={initialLocale}>
          <ThemeRegistry>
            <ToastrProvider>{children}</ToastrProvider>
          </ThemeRegistry>
        </LocaleProvider>
      </UserProvider>
    </SessionProvider>
  );
}
