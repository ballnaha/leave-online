"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LocaleCode = "th" | "en" | "my";

const DEFAULT_LOCALE: LocaleCode = "th";
const LOCALE_STORAGE_KEY = "app:locale";

const messages: Record<LocaleCode, Record<string, string>> = {
  th: {
    common_profile: "โปรไฟล์",
    common_language: "ภาษา",
    settings: "การตั้งค่า",
    home_leave_types: "ประเภทการลา",
    home_see_all: "ดูทั้งหมด",
    home_recent_requests: "คำขอล่าสุด",
    role_fulltime: "พนักงานประจำ",
    logout: "ออกจากระบบ",
    version: "เวอร์ชัน",
    nav_home: "หน้าหลัก",
    nav_messages: "ข้อความ",
    nav_favorites: "ชื่นชอบ",
    nav_profile: "โปรไฟล์",
    greeting: "สวัสดี",
    search_placeholder: "ค้นหาประวัติการลา...",
    profile_email: "อีเมล",
    profile_phone: "เบอร์โทร",
    profile_department: "แผนก",
    profile_started: "วันที่เริ่มงาน",
  },
  en: {
    common_profile: "Profile",
    common_language: "Language",
    settings: "Settings",
    home_leave_types: "Leave Types",
    home_see_all: "See all",
    home_recent_requests: "Recent Requests",
    role_fulltime: "Full-time Employee",
    logout: "Sign out",
    version: "Version",
    nav_home: "Home",
    nav_messages: "Messages",
    nav_favorites: "Favorites",
    nav_profile: "Profile",
    greeting: "Hello",
    search_placeholder: "Search leave history...",
    profile_email: "Email",
    profile_phone: "Phone",
    profile_department: "Department",
    profile_started: "Start Date",
  },
  my: {
    common_profile: "ပရိုဖိုင်",
    common_language: "ဘာသာစကား",
    settings: "ဆက်တင်များ",
    home_leave_types: "အားလပ်တန်းများ",
    home_see_all: "အားလုံးကိုကြည့်ရန်",
    home_recent_requests: "လတ်တလောတောင်းဆိုချက်များ",
    role_fulltime: "အလုပ်အကိုင်အပြည့်",
    logout: "ထွက်ရန်",
    version: "ဗားရှင်း",
    nav_home: "မူလစာမျက်နှာ",
    nav_messages: "မက်ဆေ့ခ်ျများ",
    nav_favorites: "စာရင်းသွင်းထားသည်များ",
    nav_profile: "ပရိုဖိုင်",
    greeting: "မင်္ဂလာပါ",
    search_placeholder: "ခွင့်မှတ်တမ်းရှာရန်...",
    profile_email: "အီးမေးလ်",
    profile_phone: "ဖုန်း",
    profile_department: "ဌာန",
    profile_started: "အလုပ်စတင်နေ့",
  },
};

export const localeLabel: Record<LocaleCode, string> = {
  th: "ภาษาไทย",
  en: "English",
  my: "မြန်မာ",
};

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: LocaleCode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale ?? DEFAULT_LOCALE);

  // Helper to read cookie value
  const readCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  };

  useEffect(() => {
    // If server provided initialLocale, avoid overriding on first paint
    if (initialLocale) return;
    // Priority: cookie -> localStorage -> navigator language -> default
    const fromCookie = readCookie("locale") as LocaleCode | null;
    if (fromCookie && (fromCookie === "th" || fromCookie === "en" || fromCookie === "my")) {
      setLocaleState(fromCookie);
      return;
    }
    const stored = (typeof window !== "undefined" && localStorage.getItem(LOCALE_STORAGE_KEY)) as LocaleCode | null;
    if (stored && (stored === "th" || stored === "en" || stored === "my")) {
      setLocaleState(stored);
      return;
    }
    if (typeof navigator !== "undefined") {
      const nav = navigator.language.toLowerCase();
      if (nav.startsWith("th")) setLocaleState("th");
      else if (nav.startsWith("en")) setLocaleState("en");
      else setLocaleState(DEFAULT_LOCALE);
    }
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      // Persist to cookie (1 year) for SSR hints and cross-tab consistency
      const oneYear = 60 * 60 * 24 * 365;
      document.cookie = `locale=${encodeURIComponent(locale)}; path=/; max-age=${oneYear}; samesite=lax`;
      // Reveal body once locale is applied (only on first load)
      try { 
        if (document.body.classList.contains('pre-locale')) {
          document.body.classList.remove('pre-locale'); 
        }
      } catch {}
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
  }, [locale]);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY && e.newValue) {
        const val = e.newValue as LocaleCode;
        if (val === "th" || val === "en" || val === "my") {
          setLocaleState(val);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setLocale = useCallback((l: LocaleCode) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const table = messages[locale] || {};
      return table[key] ?? fallback ?? key;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
