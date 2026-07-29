import Link from 'next/link';
import { useRouter } from 'next/router';
import { BarChart3, Bot, Calendar, CalendarDays, CreditCard, HelpCircle, Inbox, Kanban, LayoutDashboard, ListChecks, Lock, MessageSquare, Search, Settings, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../lib/store';
import Logo from './marketing/Logo';

const MotionLink = motion.create(Link);

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/client-portal', label: 'Client Portal', icon: Lock },
  { href: '/content', label: 'Calendar', icon: CalendarDays },
  { href: '/kanban', label: 'Kanban', icon: Kanban },
  { href: '/google-calendar', label: 'G-Calendar', icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/leads', label: 'Leads', icon: Inbox },
  { href: '/outreach', label: 'Outreach', icon: MessageSquare },
  { href: '/guidelines', label: 'Live Agent', icon: Bot },
  { href: '/activity', label: 'Activity', icon: ListChecks },
  { href: '/security', label: 'Security', icon: Shield },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export default function Navigation() {
  const router = useRouter();
  const { user } = useAuthStore();
  const publicPage = ['/', '/login', '/signup'].includes(router.pathname);

  const openDocsModal = () => {
    window.dispatchEvent(new CustomEvent('open-docs-modal'));
  };

  return (
    <header className="border-b border-white/10 bg-[#111113]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <MotionLink
          href={user ? '/dashboard' : '/'}
          className="flex items-center"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Logo size={22} />
        </MotionLink>

        <div className="flex items-center gap-3">
          {!publicPage && (
            <button
              onClick={openDocsModal}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#18181d] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition shadow-sm"
              title="Search Documentation & FAQs (⌘K)"
            >
              <Search size={14} className="text-orange-400" />
              <span className="hidden sm:inline">Docs & FAQs</span>
              <kbd className="hidden md:inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-neutral-400">
                ⌘K
              </kbd>
            </button>
          )}

          <nav className="hidden items-center gap-1.5 md:flex">
            {publicPage ? (
              <>
                <MotionLink
                  href="/login"
                  className="rounded px-3 py-2 text-sm text-neutral-300 hover:bg-white/10"
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  Login
                </MotionLink>
                <MotionLink
                  href="/signup"
                  className="rounded bg-orange-500 px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-orange-400 shadow-sm"
                  whileHover={{ y: -1, scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  Start
                </MotionLink>
              </>
            ) : nav.map((item) => {
              const Icon = item.icon;
              const active = router.pathname === item.href;
              return (
                <MotionLink
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-orange-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                  }`}
                  whileHover={{ y: -1.5, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Icon size={16} />
                  {item.label}
                </MotionLink>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
