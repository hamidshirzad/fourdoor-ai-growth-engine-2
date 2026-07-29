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
