import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit as limitQuery, doc, setDoc } from 'firebase/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let firebaseConfig = {};
try {
  firebaseConfig = require('../../../firebase-applet-config.json');
} catch {
  console.warn('firebase-applet-config.json not found');
}

let db = null;
if (firebaseConfig.projectId) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

    await setDoc(doc(db, 'activity_logs', logId), logData);

    if (userId && userId !== 'system') {
      try {
        await setDoc(doc(db, 'users', userId, 'activity_logs', logId), logData);
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

export async function getFirestoreAgentLogs(userId, limitNum = 100) {
  if (!db) return [];
  try {
    const logsRef = collection(db, 'activity_logs');
    const q = query(logsRef, orderBy('createdAt', 'desc'), limitQuery(limitNum));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return logs;
  } catch (err) {
    console.error('Firestore log query error:', err.message);
    return [];
  }
}

/**
 * Mirror an automation job into Firestore so the UI can stream live status.
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
    await setDoc(doc(db, 'automationJobs', job.id), data);
    return data;
  } catch (err) {
    console.error('Firestore automation job mirror error:', err.message);
    return null;
  }
}
