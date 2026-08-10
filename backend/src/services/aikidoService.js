import axios from 'axios';
import pool from '../db/pool.js';
import { logAgent } from './logService.js';

const aikidoClient = process.env.AIKIDO_API_KEY
  ? axios.create({
      baseURL: process.env.AIKIDO_API_BASE_URL || 'https://api.aikido.io',
      headers: {
        'Authorization': `Bearer ${process.env.AIKIDO_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
  : null;

export function isSecurityScanningEnabled() {
  return Boolean(aikidoClient);
}

export async function scanContent(userId, content, scanType = 'content', postId = null, campaignId = null) {
  if (!aikidoClient) {
    return {
      skipped: true,
      reason: 'AIKIDO_API_KEY not configured',
      vulnerabilities: [],
      severityCount: { critical: 0, high: 0, medium: 0, low: 0 },
      secretsFound: 0,
      passed: true
    };
  }

  try {
    const response = await aikidoClient.post('/scans', {
      content,
      type: scanType
    });

    const parsed = parseAikidoResponse(response.data);

    const result = await pool.query(
      `INSERT INTO security_scans
       (user_id, post_id, campaign_id, scanned_content, scan_type, vulnerabilities, severity_count, secrets_found, passed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        userId,
        postId || null,
        campaignId || null,
        content,
        scanType,
        JSON.stringify(parsed.vulnerabilities),
        JSON.stringify(parsed.severityCount),
        parsed.secretsFound,
        parsed.passed
      ]
    );

    await logAgent(
      userId,
      'aikido_security',
      'scan_content',
      'success',
      { content: content.substring(0, 100), scanType },
      parsed
    );

    return { ...parsed, scanId: result.rows[0].id };
  } catch (error) {
    console.error('Aikido scan error:', error.message);
    await logAgent(
      userId,
      'aikido_security',
      'scan_content',
      'error',
      { content: content.substring(0, 100), scanType },
      { error: error.message }
    );

    return {
      skipped: true,
      reason: 'Aikido API error',
      vulnerabilities: [],
      severityCount: { critical: 0, high: 0, medium: 0, low: 0 },
      secretsFound: 0,
      passed: true
    };
  }
}

function parseAikidoResponse(data) {
  const vulnerabilities = data.vulnerabilities || [];
  const severityCount = {
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length
  };

  const secretsFound = vulnerabilities.filter(v => v.type === 'secret').length;
  const passed = severityCount.critical === 0 && severityCount.high === 0;

  return {
    vulnerabilities,
    severityCount,
    secretsFound,
    passed
  };
}

export async function getScans(userId, limit = 50, offset = 0) {
  const result = await pool.query(
    `SELECT * FROM security_scans
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function getScanById(userId, scanId) {
  const result = await pool.query(
    `SELECT * FROM security_scans
     WHERE id = $1 AND user_id = $2`,
    [scanId, userId]
  );
  return result.rows[0] || null;
}

export async function getScanCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM security_scans WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}
