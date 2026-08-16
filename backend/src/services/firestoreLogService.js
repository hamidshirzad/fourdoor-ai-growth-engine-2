import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let firebaseConfig = {};
try {
  firebaseConfig = require('../../../firebase-applet-config.json');
} catch {
  console.warn('firebase-applet-config.json not found');
}

const APP_NAME = 'firestore-mirror';

/**
 * Backend Firestore access goes through the **Admin SDK**, not the client SDK.
 *
 * This matters for security, not convenience. Client SDK writes are evaluated
 * against firestore.rules exactly as a browser's are, so the only way to make a
 * server-side mirror work through it was to leave the collections writable by
 * anyone holding the project id — which is committed in
 * firebase-applet-config.json. The Admin SDK authenticates as a service account
 * and bypasses rules, which is what lets firestore.rules deny clients outright.
 *
 * Credentials are optional on purpose. Mirroring is best-effort: with no service
 * account configured `db` stays null, every export below returns its empty value,
 * and the application runs unchanged on Postgres alone. That is the current state
 * of every deployed environment, so it is the path that must not break.
 */
let db = null;

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    // Render has no filesystem to drop a key file onto, so the whole service
    // account JSON arrives as one environment variable.
    return cert(JSON.parse(raw));
  }
  // applicationDefault() fails lazily on first use rather than at construction,
  // so it is only used when something explicitly points at credentials.
  // Otherwise an unconfigured install would look initialised and then throw on
  // every write.
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return applicationDefault();
  return null;
}

if (firebaseConfig.projectId) {
  try {
    const credential = resolveCredential();
    if (credential) {
      const existing = getApps().find((a) => a.name === APP_NAME);
      const app = existing || initializeApp(
        { credential, projectId: firebaseConfig.projectId },
        APP_NAME
      );
      // firestoreDatabaseId names a non-default database; dropping this second
      // argument silently reads and writes the wrong one.
      db = firebaseConfig.firestoreDatabaseId
        ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
        : getFirestore(app);
    }
  } catch (err) {
    console.warn('Firestore initialization warning on backend:', err.message);
  }
}

export async function putFirestoreAgentLog({ userId, agent, action, status, input = {}, output = {} }) {
  if (!db) return null;
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logData = {
      userId: userId || 'system',
      agent: agent || 'systemAgent',
      action: action || 'automated_action',
      status: status || 'completed',
      input: typeof input === 'string' ? input : JSON.stringify(input),
      output: typeof output === 'string' ? output : JSON.stringify(output),
      createdAt: new Date().toISOString()
    };

    await db.collection('activity_logs').doc(logId).set(logData);

    if (userId && userId !== 'system') {
      try {
        await db.collection('users').doc(userId)
          .collection('activity_logs').doc(logId).set(logData);
      } catch {
        // Ignore user subcollection write errors if path missing
      }
    }
    return logData;
  } catch (err) {
    console.error('Firestore log write error:', err.message);
    return null;
  }
}

/**
 * Activity logs for one user.
 *
 * The `userId` filter is load-bearing: this feeds GET /api/activity/logs, and
 * without it the endpoint handed every authenticated caller every user's logs.
 *
 * The filter plus the sort needs a composite index on (userId asc, createdAt
 * desc). Firestore rejects the query with FAILED_PRECONDITION until that index
 * exists, and the catch below turns that into an empty list — so a missing index
 * shows up as "no logs", not as an error page. The console URL to create it is
 * printed in the logged message.
 */
export async function getFirestoreAgentLogs(userId, limitNum = 100) {
  if (!db || !userId) return [];
  try {
    const snapshot = await db.collection('activity_logs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Firestore log query error:', err.message);
    return [];
  }
}

/**
 * Mirror an automation job into Firestore.
 *
 * Postgres remains the store of record — this is best-effort, exactly like
 * putFirestoreAgentLog above. Returning null when Firestore is unconfigured is
 * what lets the automation loop keep working without it, so callers must not
 * treat a null here as failure.
 *
 * The document id is the Postgres row id, so repeated mirrors of the same job
 * (pending -> running -> completed) overwrite one document rather than
 * accumulating a row per transition.
 */
export async function mirrorAutomationJob(job) {
  if (!db || !job?.id) return null;
  try {
    const data = {
      userId: job.user_id,
      campaignId: job.campaign_id,
      type: job.type,
      status: job.status,
      scheduledFor: job.scheduled_for ? new Date(job.scheduled_for).toISOString() : null,
      resultSummary: job.result_summary || null,
      createdAt: job.created_at ? new Date(job.created_at).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('automationJobs').doc(job.id).set(data);
    return data;
  } catch (err) {
    console.error('Firestore automation job mirror error:', err.message);
    return null;
  }
}
