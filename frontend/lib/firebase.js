import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit as limitQuery,
  getDocs,
  onSnapshot,
  setDoc,
  doc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */

export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'default';

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export async function fetchFirestoreActivityLogs(limitNum = 50) {
  const path = 'activity_logs';
  try {
    const logsRef = collection(db, path);
    const q = query(logsRef, orderBy('createdAt', 'desc'), limitQuery(limitNum));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      source: 'firestore',
      ...docSnap.data()
    }));
  } catch (error) {
    handleFirestoreError(error, 'get', path);
    return [];
  }
}

export function subscribeToActivityLogs(limitNum = 50, onData, onError) {
  const path = 'activity_logs';
  try {
    const logsRef = collection(db, path);
    const q = query(logsRef, orderBy('createdAt', 'desc'), limitQuery(limitNum));

    return onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          source: 'firestore',
          ...docSnap.data()
        }));
        onData(logs);
      },
      (error) => {
        handleFirestoreError(error, 'get', path);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    handleFirestoreError(error, 'get', path);
    if (onError) onError(error);
    return () => {};
  }
}

export async function addFirestoreActivityLog(logData) {
  const path = 'activity_logs';
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, path, logId);
  const payload = {
    userId: logData.userId || auth.currentUser?.uid || 'system',
    agent: logData.agent || 'automatedAgent',
    action: logData.action || 'system_action',
    status: logData.status || 'completed',
    input: typeof logData.input === 'object' ? JSON.stringify(logData.input) : (logData.input || ''),
    output: typeof logData.output === 'object' ? JSON.stringify(logData.output) : (logData.output || ''),
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload);
    return { id: logId, ...payload };
  } catch (error) {
    handleFirestoreError(error, 'write', `${path}/${logId}`);
    throw error;
  }
}
