import Head from 'next/head';
import { useRouter } from 'next/router';

// Canonical origin for this site. Used to turn the router's path into the
// absolute URL that og:url and <link rel="canonical"> both require — relative
// URLs are ignored by every scraper.
//
// The apex, not www: www.fourdoorai.com currently serves a different
// application entirely, so pointing canonicals there would hand link equity and
// share previews to the wrong site. See DEPLOYMENT.md, "Frontend hosting".
export const SITE_URL = 'https://fourdoorai.com';
export const SITE_NAME = 'Fourdoor AI';

// The untitled-page fallback. Matches the title the homepage and
// MarketingPageLayout already used, so wiring this component in does not
// silently rewrite the brand line on any existing page.
export const DEFAULT_TITLE = 'Fourdoor AI — Your AI Team Works 24/7 On Autopilot';

export const SITE_DESCRIPTION =
  'AI-powered B2B growth engine for automated lead generation, content creation, engagement, and security scanning.';

/*
 * SHARE IMAGE — not configured yet, deliberately.
 *
 * og:image and twitter:image are intentionally absent. A share image tag
 * pointing at a file that does not exist is worse than no tag: scrapers cache
 * the miss, and some platforms fall back to no preview at all rather than
 * retrying. Links still show a title and description on every major platform
 * without one — they just render without a thumbnail.
 *
 * To add one:
 *   1. Drop a 1200x630 PNG at frontend/public/og-image.png.
 *   2. Add to the <Head> below, alongside the existing tags:
 *        <meta property="og:image" content={`${SITE_URL}/og-image.png`} key="og:image" />
 *        <meta property="og:image:width" content="1200" key="og:image:width" />
 *        <meta property="og:image:height" content="630" key="og:image:height" />
 *        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} key="twitter:image" />
 *   3. Change twitter:card from "summary" to "summary_large_image" — with an
 *      image present, "summary" renders a small thumbnail and wastes it.
 *
 * On Netlify, the Image CDN can serve it at exact dimensions without shipping a
 * second cropped asset:
 *   /.netlify/images?url=/og-image.png&w=1200&h=630&fit=cover&fm=png
 * Note that Vercel currently serves the production domain, where that path does
 * not exist — use the plain /og-image.png URL unless Netlify takes the domain.
 */

export default function Seo({ title, description, type = 'website', canonicalPath, noindex = false }) {
  const router = useRouter();

  // Strip query and hash: canonical and og:url should identify the page, not a
  // particular visit to it. Two links to the same page with different UTM tags
  // must not register as two different pages.
  const path = canonicalPath ?? (router.asPath || '/').split(/[?#]/)[0];
  const url = `${SITE_URL}${path === '/' ? '' : path}`;

  const resolvedTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const resolvedDescription = description || SITE_DESCRIPTION;

  // Every tag carries a `key`. next/head dedupes on it, so a page rendering its
  // own <Seo> inside a layout that also renders one gets the page's value, not
  // both — which is what "no duplicate meta tags" requires here.
  return (
    <Head>
      <title key="title">{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} key="description" />
      <link rel="canonical" href={url} key="canonical" />
      {noindex && <meta name="robots" content="noindex,nofollow" key="robots" />}

      <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
      <meta property="og:title" content={resolvedTitle} key="og:title" />
      <meta property="og:description" content={resolvedDescription} key="og:description" />
      <meta property="og:url" content={url} key="og:url" />
      <meta property="og:type" content={type} key="og:type" />

      <meta name="twitter:card" content="summary" key="twitter:card" />
      <meta name="twitter:title" content={resolvedTitle} key="twitter:title" />
      <meta name="twitter:description" content={resolvedDescription} key="twitter:description" />
    </Head>
  );
}
