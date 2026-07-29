import { WorkOS } from '@workos-inc/node';

// WorkOS integration: Audit Log event streaming and AuthKit SSO. Enabled only
// when WORKOS_API_KEY is set; otherwise every function is a no-op so the app
// runs without WorkOS, matching the s3Service/dynamoService fallback pattern.
let apiKey = process.env.WORKOS_API_KEY || '';
let organizationId = process.env.WORKOS_ORGANIZATION_ID || '';

export const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID || '';

function createClient() {
  if (!apiKey) return null;
  return new WorkOS(apiKey, WORKOS_CLIENT_ID ? { clientId: WORKOS_CLIENT_ID } : undefined);
}

let workos = createClient();

export function __setWorkosClientForTests(client, orgId = 'org_test') {
  workos = client;
  apiKey = client ? 'test-key' : '';
  organizationId = client ? orgId : '';
}

export function __resetWorkosClientForTests() {
  apiKey = process.env.WORKOS_API_KEY || '';
  organizationId = process.env.WORKOS_ORGANIZATION_ID || '';
  workos = createClient();
}

export function getWorkosClient() {
  return workos;
}

export function isAuditLogEnabled() {
  return Boolean(workos && organizationId);
}

export function isSsoEnabled() {
  return Boolean(workos && WORKOS_CLIENT_ID);
}

// Metadata stays small on purpose: full input/output payloads live in
// Postgres/DynamoDB; WorkOS receives only the event identity and status.
export function buildAuditLogEvent({ userId, agent, action, status }, now = new Date()) {
  return {
    action: `agent.${action}`,
    occurredAt: now,
    actor: {
      type: userId ? 'user' : 'system',
      id: userId || 'system'
    },
    targets: [{ type: 'agent', id: agent }],
    context: { location: 'backend' },
    metadata: { status }
  };
}

// Mirror write: must never throw, so a WorkOS outage cannot break the
// Postgres write path or the request that triggered the log.
export async function sendAuditLogEvent(entry) {
  if (!isAuditLogEnabled()) return null;
  const event = buildAuditLogEvent(entry);
  try {
    await workos.auditLogs.createEvent(organizationId, event);
    return event;
  } catch (error) {
    console.error('WorkOS audit log write failed:', error.message);
    return null;
  }
}
