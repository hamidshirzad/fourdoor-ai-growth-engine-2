import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SYSTEM_GUIDELINES = `You are the Fourdoor AI Live Growth & Support Agent. Your purpose is to assist users in real-time, answer questions about growth strategies, guide them through platform guidelines, help generate content or qualify leads, and provide operational instructions.

FOURDOOR PLATFORM GUIDELINES & POLICIES:
1. Content Creation Policy:
   - High-converting hooks, value-first captions, concise CTA.
   - Platforms supported: LinkedIn, Twitter/X, Instagram, TikTok.
   - No misleading clickbait or false revenue claims.

2. Lead Qualification Guidelines:
   - Leads scored from 0 to 100 based on company fit, urgency, budget, and buying intent.
   - Hot Leads (Score > 70) automatically qualify for priority demo scheduling.
   - Cold/Casual queries should receive automated nurturing.

3. Outreach & Security Compliance:
   - All email sequences must pass security scanner checks.
   - Adhere strictly to GDPR, CCPA, and CAN-SPAM regulations.
   - Opt-out links and company address required in commercial sequences.

4. Billing & Subscription Policies:
   - Pro Growth Plan (€79/mo): Full automated content & lead engine up to 500 leads/mo.
   - Enterprise Plan (€199/mo): Unlimited leads, custom workflows, dedicated security scanning.
   - Subscriptions are managed securely via Stripe.

5. System Auditability:
   - Every background agent action is logged in real-time in Firestore under "activity_logs".

DIRECTIONS FOR RESPONDING:
- Be professional, highly helpful, encouraging, and clear.
- Provide actionable answers directly addressing the user's question.
- Cite relevant platform guidelines or growth steps when applicable.
- If asked to write a post or draft an outreach email, generate high-quality copy immediately!`;

export async function askLiveAgent({ message, chatHistory = [], userContext = {} }) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      reply: `Welcome to Fourdoor AI! Here are our core growth guidelines:\n\n1. **Content**: Focus on value-led hooks and clear CTAs.\n2. **Lead Qualification**: Leads scored over 70 qualify automatically for outreach.\n3. **Security**: Ensure campaigns pass our Security Scanner.\n\nHow can I help you optimize your growth engine today?`,
      agent: 'Fourdoor AI Live Agent',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const formattedHistory = chatHistory
      .slice(-8)
      .map((msg) => `${msg.sender === 'user' ? 'User' : 'Agent'}: ${msg.text}`)
      .join('\n');

    const prompt = `User Context: ${JSON.stringify(userContext)}\n\nRecent Conversation:\n${formattedHistory}\n\nUser Question: ${message}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_GUIDELINES,
        temperature: 0.7,
      }
    });

    return {
      reply: response.text || 'I am here to assist with your growth engine and platform guidelines.',
      agent: 'Fourdoor AI Live Agent',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Gemini Live Agent error:', error.message);
    return {
      reply: `I received your message: "${message}". According to Fourdoor growth guidelines, maintain clear hooks on all posts and verify campaigns with the Security Scanner.`,
      agent: 'Fourdoor AI Live Agent',
      timestamp: new Date().toISOString()
    };
  }
}
