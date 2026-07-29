import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import pool from '../db/pool.js';
import { engagementAgent, salesAgent, outreachAgent } from './aiService.js';
import { createBookingForLead } from './bookingService.js';
import { logAgent } from './logService.js';
import { QUALIFICATION_THRESHOLD } from '../config/constants.js';
import { sendConversionAlertEmail } from './emailService.js';

// The model's own `qualified` boolean is advisory only: the schema cannot
// force it to be consistent with `score`, and booking-link creation hangs
// off this decision, so qualification is derived from the clamped score.
export function deriveLeadStatus(qualification, currentStatus = 'new') {
  const score = Math.max(0, Math.min(100, qualification.score));
  const qualified = score > QUALIFICATION_THRESHOLD;
  if (Boolean(qualification.qualified) !== qualified) {
    console.warn(`salesAgent returned qualified=${qualification.qualified} inconsistent with score=${qualification.score}; using score-derived value`);
  }
  return {
    score,
    status: qualified ? 'qualified' : currentStatus,
    shouldBook: qualified
  };
}

export async function createLead(userId, payload) {
  const qualification = await salesAgent({
    message: payload.message || '',
    businessType: payload.businessType || '',
    budget: payload.budget || '',
    needs: payload.needs || ''
  });

  const { score, status, shouldBook } = deriveLeadStatus(qualification, 'new');
  const bookingLink = shouldBook ? await createBookingLink(userId, payload) : null;

  const result = await pool.query(
    `INSERT INTO leads (user_id, name, email, company, source, message, score, intent, status, qualification, booking_link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      userId,
      payload.name || null,
      payload.email || null,
      payload.company || null,
      payload.source || 'manual',
      payload.message || '',
      score,
      qualification.intent,
      status,
      JSON.stringify(qualification),
      bookingLink
    ]
  );
  await logAgent(userId, 'sales_agent', 'qualify_lead', 'success', payload, qualification);
  return result.rows[0];
}

async function createBookingLink(userId, lead) {
  const base = process.env.CALENDLY_BOOKING_URL;
  if (!base) return null;
  const url = new URL(base);
  if (lead.email) url.searchParams.set('email', lead.email);
  if (lead.name) url.searchParams.set('name', lead.name);
  return url.toString();
}

export async function qualifyExistingLead(userId, leadId, answers = {}) {
  const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  if (leadResult.rowCount === 0) throw new Error('Lead not found');
  const lead = leadResult.rows[0];
  const existingQual = typeof lead.qualification === 'string' ? JSON.parse(lead.qualification || '{}') : (lead.qualification || {});
  const qualification = await salesAgent({
    message: `${lead.message || ''}\n${JSON.stringify(answers)}`,
    businessType: answers.businessType,
    budget: answers.budget,
    needs: answers.needs
  });
  const derived = deriveLeadStatus(qualification, lead.status);
  const finalStatus = answers.status ? answers.status : derived.status;
  const finalScore = answers.status === 'converted' ? Math.max(85, derived.score) : derived.score;
  const bookingLink = derived.shouldBook || finalStatus === 'converted' ? await createBookingLink(userId, lead) : lead.booking_link;

  const mergedQualification = {
    ...existingQual,
    ...qualification,
    priority: answers.priority || qualification.priority || existingQual.priority || (finalScore >= 80 ? 'High' : finalScore >= 50 ? 'Medium' : 'Low')
  };

  const result = await pool.query(
    `UPDATE leads
     SET score = $1, intent = $2, status = $3, qualification = $4, booking_link = $5, updated_at = NOW()
     WHERE id = $6 AND user_id = $7
     RETURNING *`,
    [
      finalScore,
      qualification.intent,
      finalStatus,
      JSON.stringify(mergedQualification),
      bookingLink,
      leadId,
      userId
    ]
  );
  const updatedLead = result.rows[0];

  // Send conversion alert email if status just changed to converted and notification enabled
  if (finalStatus === 'converted' && lead.status !== 'converted' && answers.notifyOnConverted !== 'false' && updatedLead.email) {
    sendConversionAlertEmail({ email: updatedLead.email, name: updatedLead.name, company: updatedLead.company }).catch((err) => {
      console.error('Conversion email alert failed:', err.message);
    });
  }

  await logAgent(userId, 'sales_agent', 'requalify_lead', 'success', { leadId, answers }, qualification);
  return updatedLead;
}

export async function handleInboundMessage(userId, payload) {
  const engagement = await engagementAgent({ message: payload.message, context: payload.context || '' });
  let leadId = payload.leadId || null;

  if (!leadId && engagement.intent !== 'casual') {
    const lead = await createLead(userId, {
      name: payload.name,
      email: payload.email,
      company: payload.company,
      source: payload.platform || 'dm',
      message: payload.message
    });
    leadId = lead.id;
  }

  await pool.query(
    `INSERT INTO messages (user_id, lead_id, platform, direction, sender, content, intent, metadata)
     VALUES ($1,$2,$3,'inbound',$4,$5,$6,$7), ($1,$2,$3,'outbound','ai',$8,$6,$7)`,
    [
      userId,
      leadId,
      payload.platform || 'manual',
      payload.sender || 'prospect',
      payload.message,
      engagement.intent,
      JSON.stringify({ leadSignal: engagement.leadSignal }),
      engagement.reply
    ]
  );
  await logAgent(userId, 'engagement_agent', 'reply_to_message', 'success', payload, engagement);

  if (engagement.shouldEscalate) {
    await logAgent(userId, 'engagement_agent', 'escalation_flagged', 'success', { leadId, message: payload.message }, { leadSignal: engagement.leadSignal });
  }

  return { ...engagement, leadId };
}

export async function getUserLeads(userId, limit = 100) {
  const leadsResult = await pool.query(
    `SELECT * FROM leads WHERE user_id = $1 ORDER BY score DESC, created_at DESC LIMIT $2`,
    [userId, Number(limit)]
  );
  const leads = leadsResult.rows;
  if (!leads || leads.length === 0) return [];

  const leadIds = leads.map((l) => l.id);
  const messagesResult = await pool.query(
    `SELECT id, lead_id, direction, sender, content, platform, created_at
     FROM messages
     WHERE user_id = $1 AND lead_id = ANY($2::uuid[])
     ORDER BY created_at DESC`,
    [userId, leadIds]
  );

  const messagesByLead = {};
  for (const msg of messagesResult.rows) {
    if (!messagesByLead[msg.lead_id]) {
      messagesByLead[msg.lead_id] = [];
    }
    if (messagesByLead[msg.lead_id].length < 5) {
      messagesByLead[msg.lead_id].push(msg);
    }
  }

  return leads.map((lead) => ({
    ...lead,
    recent_messages: messagesByLead[lead.id] || []
  }));
}

// Mirrors the constraints of the /create route's Zod schema so CSV rows are
// held to the same standard as leads created through the API.
export const csvLeadSchema = z.object({
  name: z.string().max(200).optional(),
  // matches leads.email VARCHAR(255) so validation cannot pass what the insert rejects
  email: z.string().email().max(255).optional(),
  company: z.string().max(200).optional(),
  message: z.string().max(5000).optional()
}).refine((value) => value.email || value.message, { message: 'email or message required' });

export async function importLeadsFromCsv(userId, csvBuffer) {
  const records = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  const created = [];
  const failed = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const candidate = {
      name: record.name || record.Name || undefined,
      email: record.email || record.Email || undefined,
      company: record.company || record.Company || undefined,
      message: record.message || record.notes || record.Notes || undefined
    };
    const parsed = csvLeadSchema.safeParse(candidate);
    if (!parsed.success) {
      failed.push({ row: index, record, error: parsed.error.issues.map((issue) => issue.message).join('; ') });
      continue;
    }
    try {
      created.push(await createLead(userId, {
        ...parsed.data,
        source: 'csv_upload',
        message: parsed.data.message || ''
      }));
    } catch (err) {
      console.error(`CSV import row ${index} failed:`, err.message);
      failed.push({ row: index, record, error: err.message });
    }
  }
  return { created, failed };
}

export async function createOutreachDraft(userId, leadId, context = '') {
  const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  if (leadResult.rowCount === 0) throw new Error('Lead not found');
  const lead = leadResult.rows[0];
  const draft = await outreachAgent({ lead, context });
  const result = await pool.query(
    `INSERT INTO outreach (user_id, lead_id, subject, body)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [userId, leadId, draft.subject, draft.body]
  );
  await logAgent(userId, 'outreach_agent', 'draft_message', 'success', { leadId, context }, draft);
  return result.rows[0];
}

export async function markOutreachSent(userId, outreachId) {
  const result = await pool.query(
    `UPDATE outreach SET status = 'sent', sent_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [outreachId, userId]
  );
  if (result.rowCount === 0) throw new Error('Outreach item not found');
  return result.rows[0];
}

export async function bookLead(userId, leadId, calendlyEventUri = null) {
  return createBookingForLead(userId, leadId, calendlyEventUri);
}

export async function bulkUpdateLeadStatus(userId, leadIds, status) {
  if (!Array.isArray(leadIds) || leadIds.length === 0) return { updatedCount: 0 };
  const result = await pool.query(
    `UPDATE leads
     SET status = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[]) AND user_id = $3
     RETURNING id, status`,
    [status, leadIds, userId]
  );
  return { updatedCount: result.rowCount, leads: result.rows };
}

export async function bulkDeleteLeads(userId, leadIds) {
  if (!Array.isArray(leadIds) || leadIds.length === 0) return { deletedCount: 0 };
  await pool.query(`DELETE FROM messages WHERE lead_id = ANY($1::uuid[]) AND user_id = $2`, [leadIds, userId]);
  await pool.query(`DELETE FROM outreach WHERE lead_id = ANY($1::uuid[]) AND user_id = $2`, [leadIds, userId]);
  const result = await pool.query(
    `DELETE FROM leads
     WHERE id = ANY($1::uuid[]) AND user_id = $2
     RETURNING id`,
    [leadIds, userId]
  );
  return { deletedCount: result.rowCount };
}

