import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';

const LINKS = [
  ['Product', '/features'],
  ['Pricing', '/pricing'],
  ['Use Cases', '/use-cases/b2b-saas'],
  ['Company', '/about'],
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, display: 'flex', alignItems: 'center', padding: '0 40px',
        background: scrolled ? 'rgba(10,10,11,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: 'all 300ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <Link href="/" style={{ marginRight: 48, textDecoration: 'none' }}>
        <Logo />
      </Link>
      <div style={{ display: 'flex', gap: 2, flex: 1 }} className="max-md:hidden">
        {LINKS.map(([label, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-[7px] px-3.5 py-2 text-sm text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
            style={{ textDecoration: 'none' }}
          >
            {label}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
        <Link
          href="/login"
          className="rounded-[7px] border border-white/10 px-4 py-2 text-[13px] font-medium text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
          style={{ textDecoration: 'none' }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-[7px] bg-orange-500 px-[18px] py-[9px] text-[13px] font-semibold text-neutral-950 transition-all hover:-translate-y-px hover:bg-orange-400 hover:shadow-glow"
          style={{ textDecoration: 'none' }}
        >
          Book a Demo
        </Link>
      </div>
    </nav>
  );
}
