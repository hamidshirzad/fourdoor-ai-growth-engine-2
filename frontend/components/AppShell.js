import Navigation from './Navigation';

export default function AppShell({ title, subtitle, actions, children }) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-[#0A0A0B] px-4 py-6">
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
