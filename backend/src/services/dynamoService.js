import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

// Agent activity logs in DynamoDB. Enabled only when DYNAMODB_AGENT_LOGS_TABLE
// is set; otherwise every function is a no-op so the app runs without AWS,
// matching the s3Service/aikidoService graceful-fallback pattern.
let tableName = process.env.DYNAMODB_AGENT_LOGS_TABLE || '';

function resolveRetentionDays(raw) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3650) {
    if (raw) console.warn(`Invalid AGENT_LOGS_RETENTION_DAYS "${raw}"; using default 90`);
    return 90;
  }
  return parsed;
}

const RETENTION_DAYS = resolveRetentionDays(process.env.AGENT_LOGS_RETENTION_DAYS);

function createDocClient() {
  if (!tableName) return null;
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.AWS_ACCESS_KEY_ID && {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    }),
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

let docClient = createDocClient();

export function __setDynamoClientForTests(client, table = 'test-agent-logs') {
  docClient = client;
  tableName = client ? table : '';
}

export function __resetDynamoClientForTests() {
  tableName = process.env.DYNAMODB_AGENT_LOGS_TABLE || '';
  docClient = createDocClient();
}

export function isDynamoLoggingEnabled() {
  return Boolean(tableName && docClient);
}

// Logs without a user (scheduler runs) share the 'system' partition.
export function buildAgentLogItem({ userId, agent, action, status, input = {}, output = {} }, now = new Date()) {
  return {
    pk: userId || 'system',
    sk: `${now.toISOString()}#${randomUUID()}`,
    agent,
    action,
    status,
    input,
    output,
    createdAt: now.toISOString(),
    expiresAt: Math.floor(now.getTime() / 1000) + RETENTION_DAYS * 24 * 60 * 60,
  };
}

// Mirror write: must never throw, so a DynamoDB outage can't break the
// Postgres write path or the request that triggered the log.
export async function putAgentLog(entry) {
  if (!isDynamoLoggingEnabled()) return null;
  const item = buildAgentLogItem(entry);
  try {
    await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
    return item;
  } catch (error) {
    console.error('DynamoDB agent log write failed:', error.message);
    return null;
  }
}

export async function queryAgentLogs(userId, limit = 100) {
  if (!isDynamoLoggingEnabled()) return [];
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': userId || 'system' },
      ScanIndexForward: false,
      Limit: limit,
    }));
    return result.Items || [];
  } catch (error) {
    console.error('DynamoDB agent log query failed:', error.message);
    return [];
  }
}
