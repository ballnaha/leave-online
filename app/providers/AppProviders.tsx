"use client";
import React from "react";
import ThemeRegistry from "../ThemeRegistry";
import { LocaleProvider } from "./LocaleProvider";

export default function AppProviders({ children, initialLocale }: { children: React.ReactNode; initialLocale?: "th" | "en" | "my" }) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ThemeRegistry>{children}</ThemeRegistry>
    </LocaleProvider>
  );
}
