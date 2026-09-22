/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK connection logs (e.g. offline transitions, auto-detect retries)
try {
  setLogLevel('silent');
} catch {}

// In browser environments, divert transient SDK connection messages to console.warn
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === 'string' ? a : (a as any)?.message || '')).join(' ');
    if (
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('[code=unavailable]') ||
      msg.includes('client will operate in offline mode') ||
      msg.includes('Connection failed')
    ) {
      console.warn('[POLARX Satellite Connectivity Notice]:', ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Initialize Firebase app singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Authentication instance
export const auth = getAuth(app);

// Firestore database instance with explicit firestoreDatabaseId (Required)
// Auto-detect long polling dynamically negotiates the best WebChannel transport
let firestoreDb: Firestore;
const customDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

try {
  firestoreDb = customDatabaseId
    ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true }, customDatabaseId)
    : initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });
} catch {
  firestoreDb = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
}

export const db = firestoreDb;

// Operation types for detailed logging and diagnostics
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  const isOfflineOrUnavailable =
    errCode === 'unavailable' ||
    errMsg.includes('offline') ||
    errMsg.includes('Could not reach Cloud Firestore backend');

  // In polar and sandboxed iframe environments, log connection unavailability warnings
  if (isOfflineOrUnavailable) {
    console.warn(
      `[POLARX Offline Store] Firestore ${operationType} on ${path || 'database'}: Satellite/Backend temporarily unavailable, operating in offline cache mode.`
    );
  }

  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };

  if (!isOfflineOrUnavailable) {
    console.error('Firestore Error:', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore (optional helper)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (!auth.currentUser) return true;
    await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
    return true;
  } catch (error) {
    if (
      (error instanceof Error && error.message.includes('the client is offline')) ||
      (error as any)?.code === 'unavailable'
    ) {
      console.warn('POLARX Firestore: Client is offline or satellite link disrupted.');
    }
    return false;
  }
}
