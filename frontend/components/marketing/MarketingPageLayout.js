import Head from 'next/head';
import Nav from './Nav';
import Footer from './Footer';

export default function MarketingPageLayout({ title, description, children }) {
  const fullTitle = title ? `${title} | Fourdoor AI` : 'Fourdoor AI — Your AI Team Works 24/7 On Autopilot';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-neutral-50 flex flex-col selection:bg-orange-500 selection:text-neutral-950">
      <Head>
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
      </Head>
      <Nav />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <Footer />
    </div>
  );
}
