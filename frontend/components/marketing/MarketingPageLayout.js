import Nav from './Nav';
import Footer from './Footer';
import Seo from '../Seo';

export default function MarketingPageLayout({ title, description, type = 'website', children }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-50 flex flex-col selection:bg-orange-500 selection:text-neutral-950">
      <Seo title={title} description={description} type={type} />
      {/* Lets keyboard users jump the nav on every marketing page (WCAG 2.4.1). */}
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Nav />
      <main id="main-content" className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
