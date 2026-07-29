import Head from 'next/head';
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
      <Head>
        <title>Fourdoor AI — Your AI Team Works 24/7 On Autopilot</title>
        <meta
          name="description"
          content="Fourdoor AI generates content, distributes it across platforms, engages your audience, qualifies leads, and books sales calls — completely automatically."
        />
      </Head>
      <Nav />
      <main>
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
