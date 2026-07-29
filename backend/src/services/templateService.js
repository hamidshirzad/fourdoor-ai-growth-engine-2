import pool from '../db/pool.js';

export const DEFAULT_OUTREACH_TEMPLATES = [
  {
    name: 'Initial Cold Introduction',
    category: 'initial_intro',
    subject: 'Quick question regarding {{company}}\'s lead generation',
    body: `Hi {{name}},

I noticed the work {{company}} is doing and wanted to reach out directly. 

We help companies like yours automate lead qualification and outbound outreach with AI, helping teams turn cold traffic into booked calendar meetings automatically.

Would you be open to a quick 10-minute chat this week?

Best regards,
{{sender_name}}
{{booking_link}}`
  },
  {
    name: 'Gentle 3-Day Follow-Up',
    category: 'follow_up',
    subject: 'Re: Quick question regarding {{company}}\'s lead generation',
    body: `Hi {{name}},

I know how busy things get, so I wanted to bring this to the top of your inbox.

Following up on my previous note — we recently helped a partner increase qualified sales calls by 3x without increasing ad spend.

If you have 5 minutes, you can pick a time directly on my calendar:
{{booking_link}}

Looking forward to connecting!

Best,
{{sender_name}}`
  },
  {
    name: 'Value-Add & Audit Share',
    category: 'value_add',
    subject: 'Ideas to streamline {{company}}\'s client pipeline',
    body: `Hi {{name}},

I put together a quick breakdown of how {{company}} could streamline prospect follow-ups using automated AI agents.

Here is what we identified:
1. Instantly qualify inbound website leads 24/7.
2. Automatically draft personalized email follow-ups.
3. Sync qualified prospects directly to your booking calendar.

Here is my direct link if you'd like to review together: {{booking_link}}

Cheers,
{{sender_name}}`
  },
  {
    name: 'Direct Calendar Invite',
    category: 'meeting_request',
    subject: '15 min intro call with {{company}}',
    body: `Hi {{name}},

Are you available for a brief 15-minute intro call sometime this week?

We are helping teams in your sector automate outbound outreach and scale lead responses. You can view my available slots and book directly here:

👉 {{booking_link}}

Looking forward to speaking soon,

{{sender_name}}`
  },
  {
    name: 'Breakup Email / Final Touch',
    category: 're_engagement',
    subject: 'Permission to close the loop with {{company}}?',
    body: `Hi {{name}},

I haven't heard back, so I assume timing isn't right or improving {{company}}'s lead pipeline isn't a priority right now.

I won't keep flooding your inbox. If things change in the future, feel free to grab a time on my calendar anytime: {{booking_link}}

Wishing you continued success!

Best,
{{sender_name}}`
  }
];

export function extractTemplateVariables(subject = '', body = '') {
  const combined = `${subject} ${body}`;
  const matches = combined.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  const vars = matches.map((m) => m.replace(/[\{\}\s]/g, ''));
  return Array.from(new Set(vars));
}

export function fillTemplateVariables(text = '', lead = {}, extra = {}) {
  const data = {
    name: lead.name || 'there',
    company: lead.company || 'your company',
    email: lead.email || '',
    booking_link: lead.booking_link || extra.booking_link || process.env.CALENDLY_BOOKING_URL || 'https://fourdoor.ai/book',
    sender_name: extra.sender_name || 'FourDoor AI Team',
    niche: lead.businessType || extra.niche || 'B2B',
    message: lead.message || '',
    ...extra
  };

  let rendered = text;
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    rendered = rendered.replace(regex, data[key]);
  });

  return rendered;
}

export async function getUserOutreachTemplates(userId) {
  const result = await pool.query(
    `SELECT * FROM outreach_templates WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId]
  );

  if (result.rows.length === 0) {
    // Seed default starter templates for user
    const inserted = [];
    for (const tpl of DEFAULT_OUTREACH_TEMPLATES) {
      const vars = extractTemplateVariables(tpl.subject, tpl.body);
      const res = await pool.query(
        `INSERT INTO outreach_templates (user_id, name, category, subject, body, variables)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, tpl.name, tpl.category, tpl.subject, tpl.body, JSON.stringify(vars)]
      );
      inserted.push(res.rows[0]);
    }
    return inserted;
  }

  return result.rows;
}

export async function createOutreachTemplate(userId, payload) {
  const { name, category, subject, body } = payload;
  if (!name || !subject || !body) {
    throw new Error('Template name, subject, and body are required');
  }

  const variables = extractTemplateVariables(subject, body);
  const result = await pool.query(
    `INSERT INTO outreach_templates (user_id, name, category, subject, body, variables)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, name, category || 'follow_up', subject, body, JSON.stringify(variables)]
  );

  return result.rows[0];
}

export async function updateOutreachTemplate(userId, templateId, payload) {
  const { name, category, subject, body } = payload;
  if (!name || !subject || !body) {
    throw new Error('Template name, subject, and body are required');
  }

  const variables = extractTemplateVariables(subject, body);
  const result = await pool.query(
    `UPDATE outreach_templates
     SET name = $1, category = $2, subject = $3, body = $4, variables = $5, updated_at = NOW()
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [name, category || 'follow_up', subject, body, JSON.stringify(variables), templateId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Template not found or unauthorized');
  }

  return result.rows[0];
}

export async function deleteOutreachTemplate(userId, templateId) {
  const result = await pool.query(
    `DELETE FROM outreach_templates WHERE id = $1 AND user_id = $2 RETURNING id`,
    [templateId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Template not found or unauthorized');
  }

  return { success: true, id: templateId };
}

export async function applyTemplateToLead(userId, templateId, leadId, extraVars = {}) {
  const templateRes = await pool.query('SELECT * FROM outreach_templates WHERE id = $1 AND user_id = $2', [templateId, userId]);
  if (templateRes.rowCount === 0) throw new Error('Template not found');
  const template = templateRes.rows[0];

  let lead = {};
  if (leadId) {
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
    if (leadRes.rowCount > 0) lead = leadRes.rows[0];
  }

  const renderedSubject = fillTemplateVariables(template.subject, lead, extraVars);
  const renderedBody = fillTemplateVariables(template.body, lead, extraVars);

  return {
    templateId,
    leadId,
    subject: renderedSubject,
    body: renderedBody,
    variablesUsed: template.variables
  };
}
