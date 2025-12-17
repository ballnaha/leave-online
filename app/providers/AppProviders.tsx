"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import ThemeRegistry from "../ThemeRegistry";
import { LocaleProvider } from "./LocaleProvider";
import { ToastrProvider } from "../components/Toastr";
import { UserProvider } from "./UserProvider";
import { OneSignalProvider } from "./OneSignalProvider";
import PWAProvider from "./PWAProvider";
import NotificationRequiredModal from "../components/NotificationRequiredModal";

export default function AppProviders({ children, initialLocale }: { children: React.ReactNode; initialLocale?: "th" | "en" | "my" }) {
  return (
    <SessionProvider>
      <PWAProvider>
        <UserProvider>
          <OneSignalProvider>
            <LocaleProvider initialLocale={initialLocale}>
              <ThemeRegistry>
                <ToastrProvider>
                  {children}
                  {/* Modal บังคับเปิดการแจ้งเตือน - ยกเว้นหน้า admin และ login */}
                  <NotificationRequiredModal
                    skipOnPaths={['/admin', '/login', '/register', '/api']}
                  />
                </ToastrProvider>
              </ThemeRegistry>
            </LocaleProvider>
          </OneSignalProvider>
        </UserProvider>
      </PWAProvider>
    </SessionProvider>
  );
}
