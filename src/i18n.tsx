import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export const locales = ["en", "de", "es"] as const;
export type Locale = typeof locales[number];
export const localeNames: Record<Locale, string> = { en: "English", de: "Deutsch", es: "Español" };
export const languageTags: Record<Locale, string> = { en: "en-GB", de: "de-DE", es: "es-ES" };
export const socialLocales: Record<Locale, string> = { en: "en_GB", de: "de_DE", es: "es_ES" };
export function routeLocale(pathname: string): Locale {
  const prefix = pathname.match(/^\/(de|es)(?:\/|$)/)?.[1];
  return prefix === "de" || prefix === "es" ? prefix : "en";
}
export function basePath(pathname: string): string {
  return pathname.replace(/^\/(?:de|es)(?=\/|$)/, "") || "/";
}
export function localizePath(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const match = href.match(/^([^?#]*)(.*)$/)!;
  const route = basePath(match[1]);
  return `${locale === "en" ? route : `/${locale}${route === "/" ? "" : route}`}${match[2]}`;
}
const LocaleContext = createContext<Locale>("en");
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <LocaleContext.Provider value={routeLocale(pathname)}>{children}</LocaleContext.Provider>;
}
export function useLocale() {
  const locale = useContext(LocaleContext);
  return useMemo(() => ({
    locale,
    isGerman: locale === "de",
    isSpanish: locale === "es",
    path: (href: string) => localizePath(href, locale),
    t: (en: string, de: string, es: string) => locale === "es" ? es : locale === "de" ? de : en,
  }), [locale]);
}
