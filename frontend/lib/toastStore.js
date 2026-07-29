import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ title, description, type = 'info', duration = 4500, action = null }) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id,
      title,
      description,
      type,
      duration,
      action,
      createdAt: Date.now()
    };

    set((state) => ({
      toasts: [newToast, ...state.toasts].slice(0, 5) // Limit to 5 visible toasts max
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  }
}));

// Helper utility for imperatively firing toasts anywhere in code
export const toast = {
  success: (title, description, options = {}) =>
    useToastStore.getState().addToast({ title, description, type: 'success', ...options }),
  
  error: (title, description, options = {}) =>
    useToastStore.getState().addToast({ title, description, type: 'error', ...options }),

  warning: (title, description, options = {}) =>
    useToastStore.getState().addToast({ title, description, type: 'warning', ...options }),

  info: (title, description, options = {}) =>
    useToastStore.getState().addToast({ title, description, type: 'info', ...options }),

  payment: (paymentData, options = {}) => {
    const planName = paymentData?.planName || paymentData?.plan || 'Pro Growth Suite';
    const amount = paymentData?.amount || paymentData?.price || 79;
    const currency = paymentData?.currency || 'EUR';
    const currencySymbol = currency.toUpperCase() === 'EUR' ? '€' : '$';
    const transactionId = paymentData?.transactionId || `tx_strp_${Date.now().toString(36)}`;

    return useToastStore.getState().addToast({
      title: 'Payment Confirmed!',
      description: `Subscription to ${planName} is now active. €${amount}/mo charged via Stripe.`,
      type: 'payment',
      duration: 7000,
      paymentDetails: {
        planName,
        amount,
        currency,
        currencySymbol,
        transactionId,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...options
    });
  },

  lead: (lead) => {
    const isHot = lead?.score >= 70 || lead?.status === 'hot';
    const type = isHot ? 'success' : 'info';
    const title = isHot ? '🔥 Hot Lead Qualified!' : '🎯 New Lead Captured';
    const desc = `${lead.name || lead.company || lead.email || 'Lead'} scored ${lead.score || 0}/100 [${(lead.status || 'new').toUpperCase()}]`;
    return useToastStore.getState().addToast({ title, description: desc, type, duration: 5500 });
  },

  scan: (scan) => {
    if (!scan) return;
    if (scan.skipped) {
      return useToastStore.getState().addToast({
        title: '⚠️ Security Scan Skipped',
        description: scan.reason || 'Scan skipped due to system constraints',
        type: 'warning',
        duration: 5000
      });
    }

    const issuesCount = (scan.secretsFound || 0) + (scan.vulnerabilities?.length || 0);
    if (scan.passed && issuesCount === 0) {
      return useToastStore.getState().addToast({
        title: '🛡️ Security Scan Passed',
        description: 'No secrets or vulnerabilities detected in scanned asset.',
        type: 'success',
        duration: 4500
      });
    } else {
      const isCritical = (scan.severityCount?.critical > 0) || (scan.secretsFound > 0);
      const title = isCritical ? '🚨 Critical Security Alert' : '⚠️ Security Issues Detected';
      const desc = `Found ${scan.secretsFound || 0} secret(s) and ${scan.vulnerabilities?.length || 0} vulnerability finding(s).`;
      return useToastStore.getState().addToast({
        title,
        description: desc,
        type: isCritical ? 'error' : 'warning',
        duration: 6500
      });
    }
  }
};
