import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { SiteRoutes } from "./App";
import { basePath, routeLocale } from "./i18n";
import { getInsight, getInsights } from "./content/insights";
import {
  buildArticleSchema,
  buildHomeSchema,
  buildInsightsSchema,
  buildPageSchema,
  buildServiceSchema,
} from "./config/structuredData";

// Public pages are rendered at build time; no portal, session or customer data is read.
export function renderPage(path: string) {
  const pathname = new URL(path, "https://deepbridgeadvisory.com").pathname;
  const locale = routeLocale(pathname);
  const route = basePath(pathname);
  const insight = route.startsWith("/insights/")
    ? getInsight(route.slice("/insights/".length), locale)
    : undefined;
  const schema = insight
    ? buildArticleSchema(insight, locale)
    : route === "/"
      ? buildHomeSchema(locale)
      : route === "/expertise"
        ? buildServiceSchema(locale)
        : route === "/insights"
          ? buildInsightsSchema(getInsights(locale), locale)
          : buildPageSchema(route, locale);

  return {
    html: renderToString(<StaticRouter location={path}><SiteRoutes /></StaticRouter>),
    schema,
  };
}
