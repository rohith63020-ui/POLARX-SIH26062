/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './config';
import { FirebaseUserRole, FirestoreUserProfile } from '../types';

export const DEFAULT_AVATARS: Record<FirebaseUserRole, string> = {
  ADMIN: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  LOGISTICS_MANAGER: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  EXPEDITION_OFFICER: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  RESEARCHER: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
};

export const ROLE_DETAILS: Record<FirebaseUserRole, { label: string; clearance: string; defaultStation: string }> = {
  ADMIN: {
    label: 'Apex Base Commander',
    clearance: 'LEVEL-5 FULL COMMAND',
    defaultStation: 'Bharati Station',
  },
  LOGISTICS_MANAGER: {
    label: 'Polar Logistics Manager',
    clearance: 'LEVEL-4 TOP SECRET',
    defaultStation: 'Bharati Station',
  },
  EXPEDITION_OFFICER: {
    label: 'Field Expedition Officer',
    clearance: 'LEVEL-3 TACTICAL OPS',
    defaultStation: 'Maitri Station',
  },
  RESEARCHER: {
    label: 'Polar Science Researcher',
    clearance: 'LEVEL-2 SCIENCE OBSERVER',
    defaultStation: 'Himadri Arctic Station',
  },
};

/**
 * Register a new user with Firebase Authentication and create their Firestore profile
 */
export async function registerWithEmail(
  fullName: string,
  email: string,
  password: string,
  role: FirebaseUserRole = 'RESEARCHER',
  organization: string = 'NCPOR (National Centre for Polar and Ocean Research)'
): Promise<FirestoreUserProfile> {
  // 1. Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = userCredential.user;

  // 2. Update display name in Firebase Auth
  if (fullName) {
    try {
      await updateProfile(fbUser, { displayName: fullName.trim() });
    } catch (e) {
      console.warn('Could not update Firebase Auth displayName:', e);
    }
  }

  // 3. Prepare Firestore document
  const now = new Date().toISOString();
  const userProfile: FirestoreUserProfile = {
    uid: fbUser.uid,
    displayName: fullName.trim(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    photoURL: DEFAULT_AVATARS[role],
    avatarUrl: DEFAULT_AVATARS[role],
    provider: 'password',
    role,
    organization: organization.trim() || 'NCPOR',
    createdAt: now,
    lastLogin: now,
    station: ROLE_DETAILS[role].defaultStation,
  };

  const userDocRef = doc(db, 'users', fbUser.uid);

  // 4. Save to Firestore `users/{uid}`
  try {
    await setDoc(userDocRef, userProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${fbUser.uid}`);
  }

  return userProfile;
}

/**
 * Sign in existing user with email and password
 */
export async function loginWithEmail(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> {
  // 1. Set persistence (Local vs Session)
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );
  } catch (err) {
    console.warn('Could not set persistence:', err);
  }

  // 2. Authenticate
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const fbUser = userCredential.user;

  // 3. Load user profile from Firestore `users/{uid}`
  const userDocRef = doc(db, 'users', fbUser.uid);
  let profile: FirestoreUserProfile;

  try {
    const docSnap = await getDoc(userDocRef);
    const now = new Date().toISOString();

    if (docSnap.exists()) {
      profile = docSnap.data() as FirestoreUserProfile;
      // Update lastLogin timestamp in background
      updateDoc(userDocRef, { lastLogin: now }).catch((err) => {
        console.warn('Failed to update lastLogin:', err);
      });
      profile.lastLogin = now;
    } else {
      // If user exists in Auth but has no Firestore profile (e.g. added manually in console)
      const displayName = fbUser.displayName || email.split('@')[0] || 'Polar Operator';
      profile = {
        uid: fbUser.uid,
        displayName,
        fullName: displayName,
        email: fbUser.email || email,
        photoURL: DEFAULT_AVATARS['RESEARCHER'],
        avatarUrl: DEFAULT_AVATARS['RESEARCHER'],
        provider: 'password',
        role: 'RESEARCHER',
        organization: 'NCPOR',
        createdAt: now,
        lastLogin: now,
        station: ROLE_DETAILS['RESEARCHER'].defaultStation,
      };
      await setDoc(userDocRef, profile);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
  }

  return { user: fbUser, profile };
}

/**
 * Sign in or authenticate with Google using Firebase Authentication & Firestore users/{uid}
 * Uses GoogleAuthProvider and signInWithPopup().
 * Updates or creates users/{uid} with: uid, displayName, email, photoURL, provider, role, createdAt, lastLogin
 */
export async function loginWithGoogle(): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> {
  // 1. Initialize Google Auth Provider
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  // 2. Sign in with popup
  const userCredential = await signInWithPopup(auth, provider);
  const fbUser = userCredential.user;

  // 3. Check or store user profile in Firestore: users/{uid}
  const now = new Date().toISOString();
  const userDocRef = doc(db, 'users', fbUser.uid);
  let profile: FirestoreUserProfile;

  try {
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      // User already exists: update lastLogin, profile fields, and provider
      const existingData = docSnap.data() as FirestoreUserProfile;
      const displayName = fbUser.displayName || existingData.displayName || fbUser.email?.split('@')[0] || 'Polar Operator';
      const photoURL = fbUser.photoURL || existingData.photoURL || DEFAULT_AVATARS[existingData.role || 'RESEARCHER'];

      const updates: Partial<FirestoreUserProfile> = {
        uid: fbUser.uid,
        displayName,
        email: fbUser.email || existingData.email || '',
        photoURL,
        provider: 'google',
        role: existingData.role || (fbUser.email === 'rohith63020@gmail.com' ? 'ADMIN' : 'RESEARCHER'),
        createdAt: existingData.createdAt || now,
        lastLogin: now,
        fullName: displayName,
        avatarUrl: photoURL,
      };

      await updateDoc(userDocRef, updates);
      profile = {
        ...existingData,
        ...updates,
      };
    } else {
      // Create a new user profile doc in Firestore users/{uid}
      const role: FirebaseUserRole =
        fbUser.email === 'rohith63020@gmail.com' ? 'ADMIN' : 'RESEARCHER';
      const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Polar Operator';
      const photoURL = fbUser.photoURL || DEFAULT_AVATARS[role];

      profile = {
        uid: fbUser.uid,
        displayName,
        email: fbUser.email || '',
        photoURL,
        provider: 'google',
        role,
        createdAt: now,
        lastLogin: now,
        fullName: displayName,
        avatarUrl: photoURL,
        organization: 'NCPOR (National Centre for Polar and Ocean Research)',
        station: ROLE_DETAILS[role].defaultStation,
      };

      await setDoc(userDocRef, profile);
    }
  } catch (error) {
    console.error('Firestore user profile sync warning:', error);
    const role: FirebaseUserRole =
      fbUser.email === 'rohith63020@gmail.com' ? 'ADMIN' : 'RESEARCHER';
    const displayName = fbUser.displayName || fbUser.email?.split('@')[0] || 'Polar Operator';
    const photoURL = fbUser.photoURL || DEFAULT_AVATARS[role];

    profile = {
      uid: fbUser.uid,
      displayName,
      email: fbUser.email || '',
      photoURL,
      provider: 'google',
      role,
      createdAt: now,
      lastLogin: now,
      fullName: displayName,
      avatarUrl: photoURL,
      organization: 'NCPOR (National Centre for Polar and Ocean Research)',
      station: ROLE_DETAILS[role].defaultStation,
    };
  }

  return { user: fbUser, profile };
}

/**
 * Sign in as an anonymous Guest / Demo Commander
 */
export async function loginGuest(): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> {
  const userCredential = await signInAnonymously(auth);
  const fbUser = userCredential.user;

  const now = new Date().toISOString();
  const userDocRef = doc(db, 'users', fbUser.uid);
  let profile: FirestoreUserProfile;

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      profile = docSnap.data() as FirestoreUserProfile;
    } else {
      profile = {
        uid: fbUser.uid,
        displayName: 'Guest Commander',
        fullName: 'Guest Expedition Commander',
        email: 'guest.commander@polarx.org',
        photoURL: DEFAULT_AVATARS['ADMIN'],
        avatarUrl: DEFAULT_AVATARS['ADMIN'],
        provider: 'anonymous',
        role: 'ADMIN',
        organization: 'NCPOR (National Centre for Polar and Ocean Research)',
        createdAt: now,
        lastLogin: now,
        station: ROLE_DETAILS['ADMIN'].defaultStation,
      };
      await setDoc(userDocRef, profile);
    }
  } catch {
    profile = {
      uid: fbUser.uid,
      displayName: 'Guest Commander',
      fullName: 'Guest Expedition Commander',
      email: 'guest.commander@polarx.org',
      photoURL: DEFAULT_AVATARS['ADMIN'],
      avatarUrl: DEFAULT_AVATARS['ADMIN'],
      provider: 'anonymous',
      role: 'ADMIN',
      organization: 'NCPOR',
      createdAt: now,
      lastLogin: now,
      station: 'Bharati Base',
    };
  }

  return { user: fbUser, profile };
}

/**
 * Sign out user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreUserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}
