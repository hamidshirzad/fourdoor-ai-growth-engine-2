import Seo from '../components/Seo';
import Nav from '../components/marketing/Nav';
import AutopilotHero from '../components/marketing/AutopilotHero';
import Features from '../components/marketing/Features';
import GrowthDashboard from '../components/marketing/GrowthDashboard';
import SocialProof from '../components/marketing/SocialProof';
import CTA from '../components/marketing/CTA';
import Footer from '../components/marketing/Footer';

export default function IndexPage() {
  return (
    <div className="bg-[#0A0A0B]">
      {/* No `title` prop: the homepage keeps the untitled-page default, which is
        * the full brand line rather than "Home | Fourdoor AI". */}
      <Seo description="Fourdoor AI generates content, distributes it across platforms, engages your audience, qualifies leads, and books sales calls — completely automatically." />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Nav />
      <main id="main-content">
        <AutopilotHero />
        <Features />
        <GrowthDashboard />
        <SocialProof />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
