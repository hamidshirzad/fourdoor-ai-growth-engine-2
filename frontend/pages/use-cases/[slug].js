import { useRouter } from 'next/router';
import Link from 'next/link';
import MarketingPageLayout from '../../components/marketing/MarketingPageLayout';
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';

const USE_CASES_DATA = {
  'b2b-saas': {
    title: 'B2B SaaS Growth',
    subtitle: 'Scale Monthly Recurring Revenue without bloated sales overhead.',
    badge: 'SaaS Playbook',
    headline: 'Autonomously Convert Tech Founders & VP Buyers into Demo Calls',
    desc: 'B2B SaaS prospects ignore generic mass templates. Fourdoor AI scans prospect profiles, product news, and tech stacks to generate hyper-relevant LinkedIn content and conversational outreach.',
    metrics: [
      { label: 'Avg CAC Reduction', value: '64%' },
      { label: 'Demo Booking Rate', value: '3.8x' },
      { label: 'Setup Time', value: '5 Mins' }
    ],
    highlights: [
      'Automated ICP scoring matching title, employee count, and technology signals',
      'Continuous LinkedIn thought leadership posting for founders and executives',
      'Conversational objection handling in direct messages',
      'Instant CRM sync into HubSpot, Salesforce, or Pipedrive'
    ]
  },
  'agencies': {
    title: 'Marketing & Outbound Agencies',
    subtitle: 'Manage client acquisition campaigns at 10x profitability.',
    badge: 'Agency Engine',
    headline: 'Deliver 50+ Qualified Sales Meetings / Month per Client',
    desc: 'Replace tedious client SDR account management. Fourdoor AI lets agencies manage multiple brand personas from a single dashboard with automated reporting.',
    metrics: [
      { label: 'Client Capacity', value: '10x' },
      { label: 'Profit Margin Increase', value: '45%' },
      { label: 'Client Retention', value: '94%' }
    ],
    highlights: [
      'Multi-persona management for dozens of client accounts',
      'White-label reporting dashboards and client analytics exports',
      'Automated content approval queues for agency review',
      'Dedicated IP rotation and deliverability protection'
    ]
  },
  'sales-teams': {
    title: 'Outbound Sales Teams & SDRs',
    subtitle: 'Supercharge AE calendar density and eliminate cold call exhaustion.',
    badge: 'Sales Acceleration',
    headline: 'Fill Account Executive Calendars with Qualified Buyers 24/7',
    desc: 'Empower your sales organization to spend 100% of their day closing deals instead of researching contact lists and typing manual cold outreach messages.',
    metrics: [
      { label: 'Pipeline Velocity', value: '+210%' },
      { label: 'SDR Output Equivalence', value: '5 SDRs' },
      { label: 'Lead Response Time', value: '< 2 Mins' }
    ],
    highlights: [
      'Instant AI responses to inbound comment inquiries',
      'Multi-channel outreach across LinkedIn, Twitter/X, and Email',
      'Lead enrichment with verified corporate email addresses',
      'Direct Google Calendar & Outlook scheduling'
    ]
  },
  'consultants': {
    title: 'High-Ticket Consultants & Advisors',
    subtitle: 'Position yourself as the premier authority in your niche.',
    badge: 'Consultant Strategy',
    headline: 'Attract & Book 5-Figure Consulting Clients on Autopilot',
    desc: 'Consulting requires deep authority and trust. Fourdoor AI generates insightful industry breakdowns and turns engaged readers into high-ticket advisory clients.',
    metrics: [
      { label: 'Avg Deal Size', value: '$15k+' },
      { label: 'Inbound Inquiries', value: '12 / mo' },
      { label: 'Weekly Time Saved', value: '18 Hours' }
    ],
    highlights: [
      'Long-form case study breakdown posts on LinkedIn & Twitter',
      'Thoughtful DM conversations that establish strategic trust',
      'Automated qualification filter for high-budget clients only',
      'Seamless Calendly discovery call scheduling'
    ]
  },
  'recruiters': {
    title: 'Talent Acquisition & Recruiters',
    subtitle: 'Source top-tier engineering, sales, and executive candidates.',
    badge: 'Recruiting Automation',
    headline: 'Engage Hard-to-Reach Passive Talent with Contextual AI Outreach',
    desc: 'Top 5% talent ignores standard recruiter emails. Fourdoor AI analyzes candidate github/LinkedIn achievements to craft personalized outreach messages.',
    metrics: [
      { label: 'InMail Reply Rate', value: '42%' },
      { label: 'Time to First Interview', value: '3 Days' },
      { label: 'Sourcing Efficiency', value: '8x' }
    ],
    highlights: [
      'Candidate skill set matching against open job specs',
      'Personalized career opportunity messaging',
      'Automated screening question handoff via conversational DM',
      'Sync with Applicant Tracking Systems (ATS)'
    ]
  }
};

export async function getStaticPaths() {
  const paths = Object.keys(USE_CASES_DATA).map((slug) => ({
    params: { slug },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
  const data = USE_CASES_DATA[params.slug] || null;
  return {
    props: {
      slug: params.slug,
      initialData: data,
    },
  };
}

export default function UseCasePage({ slug, initialData }) {
  const router = useRouter();
  const routeSlug = router.query.slug || slug;

  const currentKey = typeof routeSlug === 'string' && USE_CASES_DATA[routeSlug] ? routeSlug : (initialData ? slug : 'b2b-saas');
  const data = USE_CASES_DATA[currentKey] || initialData || USE_CASES_DATA['b2b-saas'];

  return (
    <MarketingPageLayout
      title={`${data.title} Use Case`}
      description={data.subtitle}
    >
      <div className="py-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {Object.keys(USE_CASES_DATA).map((key) => {
            const item = USE_CASES_DATA[key];
            const active = key === currentKey;
            return (
              <Link
                key={key}
                href={`/use-cases/${key}`}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-orange-500 text-neutral-950 shadow-md'
                    : 'border border-white/10 bg-[#111113] text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 mb-4">
            <Sparkles size={14} />
            {data.badge}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-neutral-50 mb-6 leading-tight">
            {data.headline}
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-8">
            {data.desc}
          </p>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-3.5 text-sm font-bold text-neutral-950 hover:bg-orange-400 transition-all shadow-glow"
          >
            <span>Launch Your {data.title} Engine</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
          {data.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-white/10 bg-[#111113] p-6 text-center">
              <span className="font-display text-4xl font-extrabold text-orange-400 block mb-2">{m.value}</span>
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Highlights List */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-white/10 bg-[#141416] p-8">
          <h3 className="font-display text-xl font-bold text-neutral-50 mb-6 flex items-center gap-2">
            <Zap size={20} className="text-orange-400" />
            Key Capabilities for {data.title}
          </h3>
          <div className="space-y-4">
            {data.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-teal-400 shrink-0 mt-0.5" />
                <span className="text-sm text-neutral-200">{h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MarketingPageLayout>
  );
}
