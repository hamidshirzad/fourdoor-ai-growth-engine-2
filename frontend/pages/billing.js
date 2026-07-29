import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiCall } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { toast } from '../lib/toastStore';
import { CreditCard, ExternalLink, ShieldCheck, Check, Zap, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

// Checkout runs on Stripe's hosted page rather than an in-app card form, so no
// card details are ever entered into or held by this application.
//
// Nothing here marks a user as subscribed. The page previously ran scripted
// "Verifying card credentials..." delays, minted a fake transaction id, and
// called updateUserPlan(plan, 'active') — telling people they had paid when no
// charge had been made. Plan state now comes from the server only, set by a
// signature-verified Stripe webhook, and this page just re-reads the profile.

const STATUS_STYLES = {
  active: 'text-emerald-400',
  pending: 'text-amber-400',
  past_due: 'text-red-400',
  cancelled: 'text-neutral-400',
  inactive: 'text-neutral-400'
};

export default function BillingPage() {
  const { token, user, hydrate } = useAuthStore();
  const router = useRouter();
  const [plans, setPlans] = useState({});
  const [error, setError] = useState('');
  const [pendingPlan, setPendingPlan] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [awaitingActivation, setAwaitingActivation] = useState(false);

  useEffect(() => {
    apiCall('/api/billing/plans')
      .then(setPlans)
      .catch((err) => setError(err.message));
  }, []);

  // Stripe redirects back here after checkout. The webhook that actually
  // activates the plan may land a moment later, so re-read the profile a few
  // times rather than assuming success from the URL alone.
  const refreshUntilActive = useCallback(async () => {
    setAwaitingActivation(true);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await hydrate();
      const current = useAuthStore.getState().user;
      if (current?.subscription_status === 'active') {
        setAwaitingActivation(false);
        toast.success('Subscription active', `You're on the ${String(current.plan || '').toUpperCase()} plan.`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setAwaitingActivation(false);
  }, [hydrate]);

  useEffect(() => {
    if (!router.isReady) return;
    const { checkout } = router.query;
    if (!checkout) return;

    if (checkout === 'success') {
      refreshUntilActive();
    } else if (checkout === 'cancelled') {
      toast.info('Checkout cancelled', 'No payment was taken.');
    }
    router.replace('/billing', undefined, { shallow: true });
  }, [router.isReady, router.query, refreshUntilActive, router]);

  const startCheckout = async (planKey) => {
    setError('');
    setPendingPlan(planKey);
    try {
      const origin = window.location.origin;
      const { subscription } = await apiCall('/api/billing/subscribe', 'POST', {
        plan: planKey,
        returnUrl: `${origin}/billing`,
        cancelUrl: `${origin}/billing`
      }, token);

      if (!subscription?.approveUrl) {
        throw new Error('The payment provider did not return a checkout URL.');
      }
      // Hand off to the provider's hosted checkout.
      window.location.href = subscription.approveUrl;
    } catch (err) {
      setPendingPlan(null);
      setError(err.message || 'Could not start checkout.');
    }
  };

  const openPortal = async () => {
    setError('');
    setPortalLoading(true);
    try {
      const { url } = await apiCall('/api/billing/portal', 'POST', {
        returnUrl: `${window.location.origin}/billing`
      }, token);
      window.location.href = url;
    } catch (err) {
      setPortalLoading(false);
      setError(err.message || 'Could not open the billing portal.');
    }
  };

  const currentPlan = user?.plan || 'starter';
  const currentStatus = user?.subscription_status || 'inactive';

  return (
    <ProtectedRoute>
      <AppShell
        title="Billing & Subscription"
        subtitle={`Current tier: ${currentPlan.toUpperCase()} • Status: ${currentStatus}`}
      >
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {awaitingActivation && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Payment received. Waiting for confirmation from the payment provider…</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-2xl border border-orange-500/30 bg-[#141416] p-6 shadow-xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                  <Zap size={18} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-neutral-50">Fourdoor AI Growth Subscription</h2>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Checkout is hosted by Stripe — card details are never entered on this site.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Available tiers</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(plans).map(([key, plan]) => {
                  const isCurrent = currentPlan === key && currentStatus === 'active';
                  const unavailable = plan.configured === false;
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-5 space-y-4 flex flex-col justify-between transition ${
                        isCurrent
                          ? 'border-emerald-500/50 bg-emerald-500/5'
                          : 'border-white/10 bg-[#0A0A0B] hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-neutral-50 text-base">{plan.name}</h4>
                            {isCurrent && (
                              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-bold text-orange-400">
                            €{plan.price}
                            <span className="text-xs text-neutral-400 font-normal">/mo</span>
                          </span>
                        </div>
                        <ul className="mt-3 space-y-2 text-xs text-neutral-300">
                          {plan.features?.map((feature) => (
                            <li key={feature} className="flex items-center gap-2">
                              <Check size={12} className="text-emerald-400 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() => startCheckout(key)}
                        disabled={isCurrent || unavailable || pendingPlan !== null}
                        title={unavailable ? 'This plan has no price configured yet.' : undefined}
                        className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition ${
                          isCurrent || unavailable
                            ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'bg-orange-500 text-neutral-950 font-bold hover:bg-orange-400 shadow-md disabled:opacity-60'
                        }`}
                      >
                        {pendingPlan === key ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            <span>Redirecting to checkout…</span>
                          </>
                        ) : isCurrent ? (
                          <span>Active subscription</span>
                        ) : unavailable ? (
                          <span>Unavailable</span>
                        ) : (
                          <>
                            <span>Subscribe to {plan.name}</span>
                            <ArrowRight size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {Object.keys(plans).length === 0 && !error && (
                <p className="text-xs text-neutral-500">Loading plans…</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-xl space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
                  <CreditCard size={20} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-neutral-50">Subscription & invoices</h3>
                  <p className="text-xs text-neutral-400">Self-service billing management</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Current tier</span>
                  <span className="font-semibold text-neutral-200 uppercase">{currentPlan}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400">
                  <span>Status</span>
                  <span className={`font-semibold ${STATUS_STYLES[currentStatus] || 'text-neutral-400'}`}>
                    {currentStatus}
                  </span>
                </div>
                <div className="pt-3 border-t border-white/5 text-neutral-300 leading-relaxed">
                  Update payment methods, download receipts, or cancel your subscription in the
                  Stripe billing portal.
                </div>
              </div>
            </div>

            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-neutral-800 border border-white/10 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition shadow disabled:opacity-60"
            >
              {portalLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Opening portal…</span>
                </>
              ) : (
                <>
                  <span>Manage billing</span>
                  <ExternalLink size={16} />
                </>
              )}
            </button>
          </section>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>Payments are processed by Stripe. Card details never reach Fourdoor servers.</span>
        </p>
      </AppShell>
    </ProtectedRoute>
  );
}
