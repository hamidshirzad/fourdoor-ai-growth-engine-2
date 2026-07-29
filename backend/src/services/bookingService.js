import axios from 'axios';
import pool from '../db/pool.js';

export async function createBookingForLead(userId, leadId, calendlyEventUri = null) {
  const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  if (leadResult.rowCount === 0) throw new Error('Lead not found');
  const lead = leadResult.rows[0];

  const bookingUrl = lead.booking_link || buildCalendlyUrl(lead);
  const result = await pool.query(
    `INSERT INTO bookings (user_id, lead_id, calendly_event_uri, booking_url, booked_at, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userId, leadId, calendlyEventUri, bookingUrl, calendlyEventUri ? new Date() : null, calendlyEventUri ? 'booked' : 'pending']
  );
  await pool.query(
    `UPDATE leads SET status = $1, booking_link = COALESCE(booking_link, $2), updated_at = NOW()
     WHERE id = $3`,
    [calendlyEventUri ? 'booked' : 'qualified', bookingUrl, leadId]
  );
  return result.rows[0];
}

function buildCalendlyUrl(lead) {
  const base = process.env.CALENDLY_BOOKING_URL;
  if (!base) return null;
  const url = new URL(base);
  if (lead.email) url.searchParams.set('email', lead.email);
  if (lead.name) url.searchParams.set('name', lead.name);
  return url.toString();
}

export async function syncCalendlyEvents(userId) {
  if (!process.env.CALENDLY_API_TOKEN || !process.env.CALENDLY_USER_URI) {
    return { synced: 0, reason: 'Calendly API token or user URI not configured' };
  }

  const response = await axios.get('https://api.calendly.com/scheduled_events', {
    params: {
      user: process.env.CALENDLY_USER_URI,
      min_start_time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    headers: { Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}` }
  });

  let synced = 0;
  for (const event of response.data.collection || []) {
    await pool.query(
      `UPDATE bookings
       SET calendly_event_uri = $1, booked_at = COALESCE(booked_at, $2), status = 'booked'
       WHERE user_id = $3 AND booking_url IS NOT NULL AND calendly_event_uri IS NULL`,
      [event.uri, event.start_time, userId]
    );
    synced += 1;
  }
  return { synced };
}
