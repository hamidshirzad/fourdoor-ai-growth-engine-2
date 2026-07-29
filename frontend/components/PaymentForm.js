import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_live_51RSNRICxLrDdPtPgDEVy1hzrzUr1TXiN8lJ1xyTQH9NYjUYNU69BnPpqEnIoWLHQqVqNGiRgLmBiSvNE0KJiUuDT00vhGX6XIB';

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

function PaymentFormContent({ plan, onSuccess, onCancel, isProcessing, setIsProcessing, error, setError }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    setError('');
    setIsProcessing(true);

    try {
      if (stripe && elements) {
        // Trigger validation in PaymentElement
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message);
          setIsProcessing(false);
          return;
        }
      }

      // Complete subscription API call
      await onSuccess(plan.key || 'pro');
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-neutral-100">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-[#0A0A0B] p-4 space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
          Payment Details
        </label>
        
        <PaymentElement
          options={{
            layout: 'tabs',
            theme: 'night'
          }}
        />
      </div>

      <div className="space-y-3 pt-1">
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-neutral-950 hover:bg-orange-400 disabled:opacity-50 transition shadow-lg"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Processing Order...</span>
            </>
          ) : (
            <>
              <Lock size={15} />
              <span>Subscribe Now — €{plan.price}/mo</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full text-center text-xs text-neutral-400 hover:text-neutral-200 py-1 transition"
        >
          Cancel
        </button>
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
        <ShieldCheck size={14} className="text-emerald-400" />
        <span>256-Bit SSL Secured • Stripe Verified Merchant</span>
      </div>
    </form>
  );
}

export default function PaymentForm({ plan, onSuccess, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!plan) return null;

  const options = {
    mode: 'subscription',
    amount: Math.round((plan.price || 79) * 100),
    currency: (plan.currency || 'eur').toLowerCase(),
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#f97316',
        colorBackground: '#0a0a0b',
        colorText: '#f5f5f5',
        colorDanger: '#ef4444',
        fontFamily: 'sans-serif',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormContent
        plan={plan}
        onSuccess={onSuccess}
        onCancel={onCancel}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        error={error}
        setError={setError}
      />
    </Elements>
  );
}
