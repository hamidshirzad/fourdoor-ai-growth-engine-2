import OpenAI from 'openai';
import dotenv from 'dotenv';
import { MAX_OUTREACH_SUBJECT_LEN, MAX_OUTREACH_BODY_LEN, MAX_ENGAGEMENT_REPLY_LEN, QUALIFICATION_THRESHOLD } from '../config/constants.js';

dotenv.config();

let openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export function __setOpenAIClientForTests(client) {
  openai = client;
}

export function __resetOpenAIClientForTests() {
  openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
}

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function sanitizeAgentOutput(parsed, maxLengths) {
  if (!maxLengths) return parsed;
  const sanitized = { ...parsed };
  for (const [field, max] of Object.entries(maxLengths)) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].slice(0, max);
    }
  }
  return sanitized;
}

async function structuredResponse({ name, schema, system, user, fallback, maxLengths }) {
  if (!openai) return sanitizeAgentOutput({ ...fallback(), _degraded: true }, maxLengths);

  try {
    const response = await openai.responses.create({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      text: {
        format: {
          type: 'json_schema',
          name,
          strict: true,
          schema
        }
      }
    });

    const parsed = JSON.parse(response.output_text);
    return sanitizeAgentOutput(parsed, maxLengths);
  } catch (error) {
    console.error(`Agent "${name}" call failed, using fallback:`, error.message);
    return sanitizeAgentOutput({ ...fallback(), _degraded: true }, maxLengths);
  }
}

export async function contentAgent({ niche, audience, goal, platform = 'linkedin', tone = 'clear and practical' }) {
  return structuredResponse({
    name: 'content_agent_output',
    system: 'You are content_agent for Fourdoor AI Growth Engine. Generate specific, conversion-focused marketing content. Return only data matching the schema.',
    user: JSON.stringify({ niche, audience, goal, platform, tone }),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['platform', 'contentType', 'hook', 'caption', 'script', 'hashtags', 'cta', 'variants', 'predictedScore'],
      properties: {
        platform: { type: 'string' },
        contentType: { type: 'string' },
        hook: { type: 'string' },
        caption: { type: 'string' },
        script: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        cta: { type: 'string' },
        variants: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['caption', 'angle'],
            properties: {
              caption: { type: 'string' },
              angle: { type: 'string' }
            }
          }
        },
        predictedScore: { type: 'integer', minimum: 0, maximum: 100 }
      }
    },
    fallback: () => {
      const cleanPlatform = String(platform).toLowerCase();
      const hook = `Most ${audience} miss this growth lever`;
      const caption = `${hook}: ${niche} teams can turn daily questions into content, conversations, and booked calls by building one repeatable AI-assisted workflow around ${goal}.`;
      return {
        platform: cleanPlatform,
        contentType: cleanPlatform === 'tiktok' || cleanPlatform === 'instagram' ? 'short_video' : 'post',
        hook,
        caption,
        script: `${hook}\n1. Name the pain your buyer already feels.\n2. Show the small operational fix.\n3. Invite them to reply with their current blocker.`,
        hashtags: ['#growth', '#leadgeneration', '#marketingautomation', '#ai', '#sales'],
        cta: 'Reply "growth" and I will send the checklist.',
        variants: [
          { angle: 'pain-aware', caption },
          { angle: 'proof-led', caption: `${niche} growth compounds when every post has a clear next step. Here is the simple workflow we use for ${audience}.` }
        ],
        predictedScore: 72
      };
    }
  });
}

export async function engagementAgent({ message, context = '' }) {
  return structuredResponse({
    name: 'engagement_agent_output',
    system: 'You are engagement_agent. Classify intent and write a short, helpful reply that never overpromises. Escalate buyers.',
    user: JSON.stringify({ message, context }),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['intent', 'reply', 'shouldEscalate', 'leadSignal'],
      properties: {
        intent: { type: 'string', enum: ['casual', 'interested', 'buyer'] },
        reply: { type: 'string' },
        shouldEscalate: { type: 'boolean' },
        leadSignal: { type: 'string' }
      }
    },
    fallback: () => {
      const lower = message.toLowerCase();
      const buyer = /(price|book|call|demo|hire|budget|start|buy)/i.test(lower);
      const interested = buyer || /(how|info|details|help|send)/i.test(lower);
      return {
        intent: buyer ? 'buyer' : interested ? 'interested' : 'casual',
        reply: buyer
          ? 'Happy to help. What type of business are you growing, and what is the main result you want in the next 90 days?'
          : 'Appreciate you jumping in. What part of the workflow are you trying to improve first?',
        shouldEscalate: buyer,
        leadSignal: buyer ? 'Asked for commercial next step' : interested ? 'Asked for information' : 'Light engagement'
      };
    },
    maxLengths: { reply: MAX_ENGAGEMENT_REPLY_LEN }
  });
}

export async function salesAgent({ message, businessType = '', budget = '', needs = '' }) {
  return structuredResponse({
    name: 'sales_agent_output',
    system: 'You are sales_agent. Qualify inbound leads for an AI marketing SaaS. Score 0-100 based on fit, urgency, budget, and explicit buying intent.',
    user: JSON.stringify({ message, businessType, budget, needs }),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'qualified', 'intent', 'questions', 'summary'],
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 100 },
        qualified: { type: 'boolean' },
        intent: { type: 'string', enum: ['casual', 'interested', 'buyer'] },
        questions: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' }
      }
    },
    fallback: () => {
      const text = `${message} ${businessType} ${budget} ${needs}`.toLowerCase();
      let score = 35;
      if (/(agency|coach|consultant|b2b|saas|local service|ecommerce)/.test(text)) score += 15;
      if (/(budget|€|eur|month|spend|paid|ready)/.test(text)) score += 20;
      if (/(book|call|demo|start|need|urgent|this week)/.test(text)) score += 25;
      score = Math.min(100, score);
      return {
        score,
        qualified: score > QUALIFICATION_THRESHOLD,
        intent: score > QUALIFICATION_THRESHOLD ? 'buyer' : score > 50 ? 'interested' : 'casual',
        questions: [
          'What type of business are you growing?',
          'What monthly budget can you allocate to growth?',
          'What result do you need in the next 90 days?'
        ],
        summary: score > QUALIFICATION_THRESHOLD ? 'High-intent lead with likely commercial fit.' : 'Lead needs more qualification before booking.'
      };
    }
  });
}

export async function analyticsAgent({ metrics, recentPosts }) {
  return structuredResponse({
    name: 'analytics_agent_output',
    system: 'You are analytics_agent. Find performance patterns and recommend concrete changes for the next content cycle.',
    user: JSON.stringify({ metrics, recentPosts }),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['insights', 'recommendations', 'nextExperiments'],
      properties: {
        insights: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        nextExperiments: { type: 'array', items: { type: 'string' } }
      }
    },
    fallback: () => ({
      insights: ['Posts with direct buyer language are creating the strongest lead signals.'],
      recommendations: ['Publish more problem-solution posts with one explicit reply keyword.', 'A/B test short benefit-led captions against proof-led captions.'],
      nextExperiments: ['Test a "reply growth" CTA on LinkedIn and X.', 'Run one TikTok/Reels script with a sharper first-line hook.']
    })
  });
}

export async function outreachAgent({ lead, context }) {
  return structuredResponse({
    name: 'outreach_agent_output',
    system: 'You are an outbound personalization agent. Write concise, ethical outreach for a relevant business lead.',
    user: JSON.stringify({ lead, context }),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['subject', 'body'],
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' }
      }
    },
    fallback: () => ({
      subject: `Growth idea for ${lead.company || lead.name || 'your team'}`,
      body: `Hi ${lead.name || 'there'}, noticed ${lead.company || 'your business'} could likely turn more social engagement into qualified calls. Fourdoor helps generate content, reply to intent, and route hot leads to booking automatically. Worth a quick look?`
    }),
    maxLengths: { subject: MAX_OUTREACH_SUBJECT_LEN, body: MAX_OUTREACH_BODY_LEN }
  });
}
