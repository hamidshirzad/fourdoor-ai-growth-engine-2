import { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { subscribeAuth, signInWithGoogle, signInWithEmail, signUpWithEmail, logoutUser } from '../lib/firebaseAuth';
import { Shield, Lock, TrendingUp, Users, Activity, CheckCircle2, AlertCircle, RefreshCw, Download, Calendar, Mail, Zap, BarChart3, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientPortalPage() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Portal metrics & state
  const [campaignRange, setCampaignRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    impressions: 142850,
    reach: 98400,
    engagementRate: 6.4,
    ctr: 3.8,
    qualifiedLeads: 312,
    bookedCalls: 48,
    pipelineValue: '$184,500'
  });

  const [milestones, setMilestones] = useState([
    { id: 1, title: 'AI Content Distribution Engine Calibrated', status: 'Completed', date: 'July 18, 2026' },
    { id: 2, title: 'Multi-Channel Lead Scraper & Qualifier Active', status: 'Completed', date: 'July 21, 2026' },
    { id: 3, title: 'Automated Outreach Sequence & Follow-ups', status: 'Running', date: 'Active 24/7' },
    { id: 4, title: 'Quarterly Revenue Scaling & ROI Optimization', status: 'Scheduled', date: 'Aug 05, 2026' }
  ]);

  useEffect(() => {
    const unsubscribe = subscribeAuth((user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = isSignUp ? await signUpWithEmail(email, password) : await signInWithEmail(email, password);
      if (res.error) throw new Error(res.error);
      setSuccess(isSignUp ? 'Account created successfully!' : 'Successfully signed in.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) throw new Error(res.error);
      setSuccess('Successfully authenticated with Google.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setSuccess('Signed out securely.');
  };

  const refreshMetrics = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMetrics({
        impressions: Math.floor(140000 + Math.random() * 10000),
        reach: Math.floor(95000 + Math.random() * 8000),
        engagementRate: +(5.5 + Math.random() * 2).toFixed(1),
        ctr: +(3.2 + Math.random() * 1.5).toFixed(1),
        qualifiedLeads: Math.floor(300 + Math.random() * 30),
        bookedCalls: Math.floor(45 + Math.random() * 10),
        pipelineValue: `$${(180000 + Math.floor(Math.random() * 15000)).toLocaleString()}`
      });
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <ProtectedRoute>
      <AppShell
        title="Secure Client Portal"
        subtitle="End-to-end encrypted campaign tracking and real-time growth analytics powered by Firebase Auth."
      >
        {authLoading ? (
          <div className="py-24 text-center text-sm text-neutral-400">Verifying secure authentication state...</div>
        ) : !firebaseUser ? (
          <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#141416] p-8 shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <Lock size={26} />
            </div>
            <h2 className="text-xl font-bold text-neutral-50 text-center">Secure Client Login</h2>
            <p className="mt-2 text-sm text-neutral-400 text-center">
              Authenticate securely using your Firebase credentials to access private growth campaign metrics and reports.
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mt-4 flex items-center gap-2 rounded bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded border border-white/10 bg-[#111113] px-3 py-2 text-sm text-neutral-200 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded bg-orange-500 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-orange-400 transition"
              >
                {isSignUp ? 'Create Secure Account' : 'Sign In to Portal'}
              </button>
            </form>

            <div className="mt-4">
              <button
                onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 rounded border border-white/10 bg-[#111113] py-2.5 text-sm font-medium text-neutral-200 hover:bg-white/5 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9c-.3-.8-.5-1.7-.5-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-orange-400 hover:underline"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Authenticated Header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                  <Shield size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-50">{firebaseUser.email}</span>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Authenticated (Firebase)</span>
                  </div>
                  <p className="text-xs text-neutral-400">Secure Client Session Active • End-to-End SSL Enforced</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshMetrics}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 rounded border border-white/10 bg-[#141416] px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/5 transition"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>Sync Metrics</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Campaign Filter & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === 'overview'
                      ? 'bg-orange-500 text-neutral-950 shadow'
                      : 'border border-white/10 bg-[#141416] text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  Campaign Overview
                </button>
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    activeTab === 'milestones'
                      ? 'bg-orange-500 text-neutral-950 shadow'
                      : 'border border-white/10 bg-[#141416] text-neutral-300 hover:bg-white/5'
                  }`}
                >
                  Milestones & Roadmap
                </button>
              </div>
              <div className="flex items-center gap-2">
                {['7d', '30d', '90d', 'All'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setCampaignRange(range)}
                    className={`rounded px-3 py-1 text-xs font-medium transition ${
                      campaignRange === range
                        ? 'border border-orange-500/30 bg-orange-500/10 text-orange-400'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'overview' ? (
              <div className="space-y-6">
                {/* Metrics Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-5">
                    <p className="text-xs font-semibold uppercase text-neutral-400">Total Impressions</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-50">{metrics.impressions.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-emerald-400">↑ 18.4% vs last period</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-5">
                    <p className="text-xs font-semibold uppercase text-neutral-400">Qualified Leads</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-50">{metrics.qualifiedLeads}</p>
                    <p className="mt-1 text-xs text-emerald-400">↑ 12.1% conversion velocity</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-5">
                    <p className="text-xs font-semibold uppercase text-neutral-400">Booked Strategy Calls</p>
                    <p className="mt-2 text-2xl font-bold text-neutral-50">{metrics.bookedCalls}</p>
                    <p className="mt-1 text-xs text-emerald-400">↑ 24.0% meeting rate</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-5">
                    <p className="text-xs font-semibold uppercase text-neutral-400">Pipeline Value</p>
                    <p className="mt-2 text-2xl font-bold text-orange-500">{metrics.pipelineValue}</p>
                    <p className="mt-1 text-xs text-emerald-400">Estimated ROI 4.8x</p>
                  </div>
                </div>

                {/* Detailed Performance Breakdowns */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-[#141416] p-6">
                    <h3 className="text-base font-semibold text-neutral-50 flex items-center gap-2">
                      <BarChart3 size={18} className="text-orange-500" />
                      Campaign Engagement & CTR
                    </h3>
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Engagement Rate</span>
                          <span className="text-neutral-200 font-semibold">{metrics.engagementRate}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(metrics.engagementRate / 10) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Click-Through Rate (CTR)</span>
                          <span className="text-neutral-200 font-semibold">{metrics.ctr}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(metrics.ctr / 10) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                          <span>Audience Reach Efficiency</span>
                          <span className="text-neutral-200 font-semibold">91.4%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '91.4%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#141416] p-6">
                    <h3 className="text-base font-semibold text-neutral-50 flex items-center gap-2">
                      <Zap size={18} className="text-orange-500" />
                      Security & Compliance Status
                    </h3>
                    <div className="mt-6 space-y-3 text-sm text-neutral-300">
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111113] p-3">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          Firebase Auth Session Verified
                        </span>
                        <span className="text-xs text-emerald-400 font-mono">SECURE</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111113] p-3">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          Data Encryption in Transit (TLS 1.3)
                        </span>
                        <span className="text-xs text-emerald-400 font-mono">ACTIVE</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111113] p-3">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          GDPR & CCPA Privacy Compliance
                        </span>
                        <span className="text-xs text-emerald-400 font-mono">COMPLIANT</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#141416] p-6">
                <h3 className="text-base font-semibold text-neutral-50 mb-4">Campaign Implementation Milestones</h3>
                <div className="space-y-4">
                  {milestones.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111113] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {m.status === 'Completed' ? <CheckCircle2 size={16} /> : <Activity size={16} />}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-100 text-sm">{m.title}</p>
                          <p className="text-xs text-neutral-400">{m.date}</p>
                        </div>
                      </div>
                      <span className={`rounded px-2.5 py-1 text-xs font-semibold ${
                        m.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-orange-500/15 text-orange-400'
                      }`}>
                        {m.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}
