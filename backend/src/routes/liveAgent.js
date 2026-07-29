import { Router } from 'express';
import { askLiveAgent } from '../services/geminiAgentService.js';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, chatHistory, userContext } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await askLiveAgent({
      message,
      chatHistory: chatHistory || [],
      userContext: userContext || {}
    });

    return res.json(result);
  } catch (err) {
    console.error('Live Agent Route Error:', err);
    return res.status(500).json({
      error: 'Failed to process request with Live Agent',
      details: err.message
    });
  }
});

router.get('/guidelines', (req, res) => {
  res.json({
    title: 'Fourdoor AI Growth Engine Guidelines & Protocols',
    version: '2.4.0',
    guidelines: [
      {
        category: 'Content Generation',
        icon: 'Sparkles',
        rules: [
          'High-converting hooks tailored to buyer persona (B2B SaaS, Agency, Services).',
          'Single, explicit Call To Action (CTA) per social post.',
          'Strict prohibition of misleading engagement-bait or false metrics.'
        ]
      },
      {
        category: 'Lead Qualification & Scoring',
        icon: 'Target',
        rules: [
          'Leads are scored 0–100 based on fit, urgency, budget, and commercial intent.',
          'Score > 70 triggers Hot Lead status and automated instant booking options.',
          'Lead status updates trigger audit entries in activity logs.'
        ]
      },
      {
        category: 'Outreach & Security Compliance',
        icon: 'ShieldCheck',
        rules: [
          'All email and direct messaging campaigns must be scanned before launching.',
          'Zero-tolerance policy for spamming; standard opt-out mechanism required.',
          '256-bit SSL encryption applied to all customer data in transit.'
        ]
      },
      {
        category: 'Billing & Account Tiers',
        icon: 'CreditCard',
        rules: [
          'Pro Growth Suite: €79/mo for up to 500 leads & automated content engine.',
          'Enterprise Suite: €199/mo for unlimited leads & dedicated security scanning.',
          'Instant 1-click upgrade via encrypted Stripe payment portal.'
        ]
      }
    ]
  });
});

export default router;
