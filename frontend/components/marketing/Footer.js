import Link from 'next/link';
import Logo from './Logo';

const COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    title: 'Use Cases',
    links: [
      { label: 'B2B SaaS', href: '/use-cases/b2b-saas' },
      { label: 'Agencies', href: '/use-cases/agencies' },
      { label: 'Sales Teams', href: '/use-cases/sales-teams' },
      { label: 'Consultants', href: '/use-cases/consultants' },
      { label: 'Recruiters', href: '/use-cases/recruiters' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Security', href: '/security-info' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-white/10 bg-[#0A0A0B] px-6 py-16 text-neutral-300">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 grid grid-cols-2 gap-10 sm:grid-cols-2 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Logo size={24} />
            </div>
            <p className="max-w-[220px] text-sm leading-relaxed text-neutral-400">
              Fully autonomous AI growth engine. Your team, on autopilot.
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                {col.title}
              </div>
              <div className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-neutral-300 transition-colors hover:text-orange-400"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-white/10 pt-6 gap-4">
          <span className="text-xs text-neutral-400">
            © 2026 Fourdoor AI, Inc. All rights reserved.
          </span>
          <Link
            href="/status"
            className="flex items-center gap-2 text-xs text-neutral-300 hover:text-emerald-400 transition-colors"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
