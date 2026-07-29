import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function SettingsPage() {
  const { user, token, logout } = useAuthStore();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ platform: 'linkedin', accountName: '', accountId: '', accessToken: '' });

  useEffect(() => {
    if (token) apiCall('/api/distribution/accounts', 'GET', null, token).then(setAccounts).catch(console.error);
  }, [token]);

  const connect = async () => {
    await apiCall('/api/distribution/accounts', 'POST', form, token);
    setForm({ platform: 'linkedin', accountName: '', accountId: '', accessToken: '' });
    setAccounts(await apiCall('/api/distribution/accounts', 'GET', null, token));
  };

  return (
    <ProtectedRoute>
      <AppShell title="Settings" subtitle="Manage account details and social distribution connections.">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">Account</h2>
            <div className="mt-4 space-y-2 text-sm text-neutral-300">
              <p>{user?.name}</p>
              <p>{user?.email}</p>
              <p>{user?.company}</p>
              <p>Plan: {user?.plan} / {user?.subscription_status}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href="https://billing.stripe.com/p/login/28E4gydJufrC57s7cr7Re00"
                target="_blank"
                rel="noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-orange-400"
              >
                <span>Stripe Billing Portal</span>
              </a>
              <button onClick={logout} className="focus-ring rounded border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10">Logout</button>
            </div>
          </section>
          <section className="rounded border border-white/10 bg-[#141416] p-5">
            <h2 className="text-lg font-semibold text-neutral-50">Connect Social Account</h2>
            <div className="mt-4 grid gap-3">
              <select className="focus-ring rounded border border-white/10 px-3 py-2" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                <option value="linkedin">LinkedIn</option>
                <option value="x">X</option>
                <option value="instagram">Instagram</option>
              </select>
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Account name" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Account id / URN" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} />
              <input className="focus-ring rounded border border-white/10 px-3 py-2" placeholder="Access token" type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} />
              <button onClick={connect} disabled={!form.accessToken} className="focus-ring rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50">Connect</button>
            </div>
          </section>
        </div>
        <section className="mt-4 rounded border border-white/10 bg-[#141416] p-5">
          <h2 className="text-lg font-semibold text-neutral-50">Connected Accounts</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {accounts.map((account) => (
              <div key={account.id} className="rounded border border-white/10 p-4">
                <p className="font-semibold text-neutral-50">{account.platform}</p>
                <p className="text-sm text-neutral-400">{account.account_name || account.account_id}</p>
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
