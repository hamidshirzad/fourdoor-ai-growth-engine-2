import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function AutopilotHero() {
  const canvasRef = useRef(null);
  const [stat1, setStat1] = useState('0');
  const [stat2, setStat2] = useState('0');
  const [stat3, setStat3] = useState('0');
  const [statusText, setStatusText] = useState('FOURDOOR.AI · STATUS: ACTIVE');

  // Counter animations
  useEffect(() => {
    const animateCounter = (setter, target, suffix, duration) => {
      const start = performance.now();
      const update = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        const val = Math.floor(ease * target);
        setter(val.toLocaleString() + suffix);
        if (p < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    };

    const timer = setTimeout(() => {
      animateCounter(setStat1, 3, 'm', 1800);
      animateCounter(setStat2, 0, '', 1600);
      animateCounter(setStat3, 1000, '+', 2000);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Status ticker interval
  useEffect(() => {
    const statuses = [
      'FOURDOOR.AI · STATUS: ACTIVE',
      'FOURDOOR.AI · PROCESSING: 2.4K POSTS/DAY',
      'FOURDOOR.AI · LEADS QUALIFIED: 847',
      'FOURDOOR.AI · CALLS BOOKED: 23'
    ];
    const interval = setInterval(() => {
      setStatusText(statuses[Math.floor(Math.random() * statuses.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Starfield Warp Canvas Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = canvas.parentElement.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const NUM_STARS = 350;
    const stars = Array.from({ length: NUM_STARS }, () => ({
      x: (Math.random() - 0.5) * width * 4,
      y: (Math.random() - 0.5) * height * 4,
      z: Math.random() * width,
      pz: 0,
      hue: Math.random() < 0.2 ? 30 + Math.random() * 20 : 200 + Math.random() * 40,
      size: Math.random() * 1.4 + 0.4,
    }));

    let mx = 0, my = 0;
    const handleMouseMove = (e) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.5;
      my = (e.clientY / window.innerHeight - 0.5) * 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    let speed = 0.8;
    let tick = 0;

    function drawStars() {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2 + mx * 40;
      const cy = height / 2 + my * 40;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.8);
      grad.addColorStop(0, 'rgba(10,10,11,0.0)');
      grad.addColorStop(0.4, 'rgba(20,18,24,0.2)');
      grad.addColorStop(1, 'rgba(10,10,11,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const s of stars) {
        s.pz = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * width * 4;
          s.y = (Math.random() - 0.5) * height * 4;
          s.z = width;
          s.pz = s.z;
        }

        const sx = (s.x / s.z) * width + cx;
        const sy = (s.y / s.z) * height + cy;
        const psx = (s.x / s.pz) * width + cx;
        const psy = (s.y / s.pz) * height + cy;

        const depth = 1 - s.z / width;
        const r = s.size * depth * 2;
        const alpha = Math.min(1, depth * 1.3);

        ctx.beginPath();
        ctx.moveTo(psx, psy);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `hsla(${s.hue},85%,80%,${alpha})`;
        ctx.lineWidth = r;
        ctx.stroke();

        if (depth > 0.7) {
          ctx.beginPath();
          ctx.arc(sx, sy, r * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${s.hue},90%,85%,${(depth - 0.7) * 0.4})`;
          ctx.fill();
        }
      }

      const lf = ctx.createRadialGradient(cx, cy, 0, cx, cy, 250);
      lf.addColorStop(0, 'rgba(249,115,22,0.03)');
      lf.addColorStop(0.5, 'rgba(20,184,166,0.02)');
      lf.addColorStop(1, 'transparent');
      ctx.fillStyle = lf;
      ctx.fillRect(0, 0, width, height);

      tick++;
      speed = 1.2 + Math.sin(tick * 0.006) * 0.8;

      animId = requestAnimationFrame(drawStars);
    }

    drawStars();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0B] text-neutral-50 flex flex-col items-center justify-center py-16 px-4">
      {/* Starfield Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Nebulas */}
      <div className="pointer-events-none absolute inset-0 z-1 overflow-hidden">
        <div className="absolute -left-48 -top-36 h-[600px] w-[800px] rounded-full bg-[radial-gradient(ellipse,_rgba(249,115,22,0.25)_0%,_transparent_70%)] blur-[100px] animate-nebula-a" />
        <div className="absolute -right-28 -bottom-36 h-[500px] w-[700px] rounded-full bg-[radial-gradient(ellipse,_rgba(20,184,166,0.2)_0%,_transparent_70%)] blur-[100px] animate-nebula-b" />
        <div className="absolute top-[35%] left-[50%] h-[400px] w-[500px] rounded-full bg-[radial-gradient(ellipse,_rgba(249,115,22,0.15)_0%,_transparent_70%)] blur-[100px] animate-nebula-c" />
        <div className="absolute top-[5%] right-[10%] h-[450px] w-[600px] rounded-full bg-[radial-gradient(ellipse,_rgba(20,184,166,0.12)_0%,_transparent_70%)] blur-[100px] animate-nebula-d" />
      </div>

      {/* Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-2 animate-grid-breathe"
        style={{
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Scanline */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-3 h-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-scanline" />

      {/* Corner Decorations */}
      <div className="pointer-events-none absolute top-6 left-6 z-10 h-14 w-14 border-t border-l border-orange-500/40 hidden sm:block" />
      <div className="pointer-events-none absolute top-6 right-6 z-10 h-14 w-14 border-t border-r border-orange-500/40 hidden sm:block" />
      <div className="pointer-events-none absolute bottom-6 left-6 z-10 h-14 w-14 border-b border-l border-orange-500/40 hidden sm:block" />
      <div className="pointer-events-none absolute bottom-6 right-6 z-10 h-14 w-14 border-b border-r border-orange-500/40 hidden sm:block" />

      {/* Content Stage */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center justify-center text-center">
        {/* Orb */}
        <div className="relative mb-10 flex h-36 w-36 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,_rgba(249,115,22,0.9)_0%,_rgba(249,115,22,0.7)_25%,_rgba(20,184,166,0.5)_50%,_rgba(20,184,166,0.3)_75%,_transparent_100%)] shadow-[0_0_60px_rgba(249,115,22,0.4),0_0_120px_rgba(249,115,22,0.2),0_0_200px_rgba(20,184,166,0.15)] text-6xl animate-orb-pulse">
          🚀
          <div className="absolute -inset-5 rounded-full border-2 border-orange-500/30 animate-spin-slow" />
          <div className="absolute -inset-10 rounded-full border border-dashed border-teal-500/20 animate-spin-reverse-slower" />
        </div>

        {/* Eyebrow */}
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-orange-500">
          Autonomous Growth Engine
        </div>

        {/* Heading */}
        <h1 className="mb-6 font-display text-4xl font-extrabold leading-tight sm:text-6xl md:text-7xl tracking-tight max-w-4xl bg-gradient-to-br from-white via-orange-500 to-teal-400 bg-clip-text text-transparent">
          Your AI Team Works 24/7 On Autopilot
        </h1>

        {/* Subtitle */}
        <p className="mb-8 max-w-xl text-base text-neutral-400 sm:text-lg md:text-xl leading-relaxed">
          Generate content. Distribute across platforms. Engage your audience. Book qualified calls. All while you sleep.
        </p>

        {/* Divider */}
        <div className="mb-10 h-[1px] w-28 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

        {/* Metrics */}
        <div className="mb-12 flex flex-wrap items-center justify-center gap-12 sm:gap-16">
          <div className="text-center">
            <span className="block font-display text-3xl sm:text-4xl font-bold text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              {stat1}
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Seconds to set up
            </span>
          </div>
          <div className="text-center">
            <span className="block font-display text-3xl sm:text-4xl font-bold text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              {stat2}
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-neutral-400">
              SDRs needed
            </span>
          </div>
          <div className="text-center">
            <span className="block font-display text-3xl sm:text-4xl font-bold text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              {stat3}
            </span>
            <span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Conversations per day
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-950 shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all hover:bg-orange-400 hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] hover:-translate-y-0.5"
          >
            Book a Demo
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-transparent px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-neutral-100 transition-all hover:border-orange-500 hover:bg-orange-500/10 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:-translate-y-0.5"
          >
            View Features & Case Studies
          </a>
        </div>
      </div>

      {/* Live Status Ticker */}
      <div className="relative mt-16 text-center font-mono text-xs tracking-wider text-orange-500/50">
        {statusText}
      </div>

      {/* Embedded Animations CSS */}
      <style jsx global>{`
        @keyframes nebulaDriftA {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 40px) scale(1.1); }
        }
        @keyframes nebulaDriftB {
          0% { transform: translate(0, 0) scale(1.1); }
          100% { transform: translate(-40px, -30px) scale(1); }
        }
        @keyframes gridBreathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes scanlineAnim {
          0% { top: -5px; }
          100% { top: 100%; }
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 0 60px rgba(249,115,22,0.4), 0 0 120px rgba(249,115,22,0.2), 0 0 200px rgba(20,184,166,0.15); }
          50% { box-shadow: 0 0 90px rgba(249,115,22,0.6), 0 0 180px rgba(249,115,22,0.35), 0 0 280px rgba(20,184,166,0.25); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinReverseSlower {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        .animate-nebula-a { animation: nebulaDriftA 22s ease-in-out infinite alternate; }
        .animate-nebula-b { animation: nebulaDriftB 17s ease-in-out infinite alternate; }
        .animate-nebula-c { animation: nebulaDriftA 25s ease-in-out infinite alternate; }
        .animate-nebula-d { animation: nebulaDriftB 20s ease-in-out infinite alternate; }
        .animate-grid-breathe { animation: gridBreathe 8s ease-in-out infinite; }
        .animate-scanline { animation: scanlineAnim 5s linear infinite; }
        .animate-orb-pulse { animation: orbPulse 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spinSlow 8s linear infinite; }
        .animate-spin-reverse-slower { animation: spinReverseSlower 14s linear infinite; }
      `}</style>
    </section>
  );
}
