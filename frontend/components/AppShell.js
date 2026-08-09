import Navigation from './Navigation';
import Seo from './Seo';

export default function AppShell({ title, subtitle, actions, children }) {
  return (
    <>
      {/* Signed-in pages are behind auth and should never be indexed or shown
       * as a share preview, but they still need a correct <title> for tab and
       * history legibility. Seo supplies that plus a canonical; the noindex
       * below keeps them out of search results. */}
      <Seo title={title} description={subtitle} noindex />
      {/* Lets keyboard users jump the 13-item nav on every app page (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation />
      <main id="main-content" className="min-h-screen bg-[#0A0A0B] px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-neutral-50" style={{ letterSpacing: '-0.02em' }}>{title}</h1>
              {subtitle && <p className="mt-1 max-w-2xl text-sm text-neutral-400">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
