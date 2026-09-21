/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  loginGuest,
  logoutUser,
  sendPasswordReset,
  getUserProfile,
  ROLE_DETAILS,
  DEFAULT_AVATARS,
} from '../firebase/authService';
import { seedPolarxDatabaseIfEmpty } from '../firebase/dbService';
import { FirebaseUserRole, FirestoreUserProfile, AppTab } from '../types';

// Role-based route definitions
export const ROLE_PERMISSIONS: Record<FirebaseUserRole, string[]> = {
  ADMIN: [
    'dashboard',
    'ops',
    'expeditions',
    'exped',
    'cargo',
    'assets',
    'inventory',
    'stock',
    'personnel',
    'ai-insights',
    'ai',
    'emergency',
    'sos',
    'sim',
    'reports',
    'settings',
    'profile',
  ],
  LOGISTICS_MANAGER: [
    'dashboard',
    'ops',
    'cargo',
    'assets',
    'inventory',
    'stock',
    'ai-insights',
    'ai',
    'reports',
    'settings',
    'profile',
  ],
  EXPEDITION_OFFICER: [
    'dashboard',
    'ops',
    'expeditions',
    'exped',
    'personnel',
    'emergency',
    'sos',
    'reports',
    'settings',
    'profile',
  ],
  RESEARCHER: [
    'dashboard',
    'ops',
    'expeditions',
    'exped',
    'ai-insights',
    'ai',
    'reports',
    'settings',
    'profile',
  ],
};

export function checkRouteAllowed(role: FirebaseUserRole | undefined, tabOrPath: string): boolean {
  if (!role) return false;
  const clean = tabOrPath.replace(/^\//, '').toLowerCase();
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(clean);
}

export function getRoleAllowedRoutes(role: FirebaseUserRole | undefined): string[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: FirestoreUserProfile | null;
  loading: boolean;
  error: string | null;
  register: (
    fullName: string,
    email: string,
    pass: string,
    role: FirebaseUserRole,
    organization?: string
  ) => Promise<FirestoreUserProfile>;
  login: (
    email: string,
    pass: string,
    rememberMe?: boolean
  ) => Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }>;
  loginGoogle: () => Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }>;
  loginDemoGuest: () => Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isRouteAllowed: (route: string) => boolean;
  allowedRoutes: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<FirestoreUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize Firebase Auth state and Firestore user profile
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          setCurrentUser(user);

          // Build instantaneous provisional profile so authentication is immediately unlocked
          const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com');
          const role: FirebaseUserRole =
            user.email === 'rohith63020@gmail.com' ? 'ADMIN' : 'RESEARCHER';
          const now = new Date().toISOString();
          const displayName = user.displayName || user.email?.split('@')[0] || 'Polar Operator';
          const photoURL = user.photoURL || DEFAULT_AVATARS[role];
          const initialProf: FirestoreUserProfile = {
            uid: user.uid,
            displayName,
            fullName: displayName,
            email: user.email || '',
            photoURL,
            avatarUrl: photoURL,
            provider: isGoogle ? 'google' : 'password',
            role,
            organization: 'NCPOR (National Centre for Polar and Ocean Research)',
            station: ROLE_DETAILS[role].defaultStation,
            createdAt: now,
            lastLogin: now,
          };

          setUserProfile((prev) => prev || initialProf);

          // Set up real-time listener on the user's Firestore profile doc
          const docRef = doc(db, 'users', user.uid);
          unsubscribeFirestore = onSnapshot(
            docRef,
            (snapshot) => {
              if (snapshot.exists()) {
                setUserProfile(snapshot.data() as FirestoreUserProfile);
              } else {
                // If the profile document doesn't exist yet, create it
                setUserProfile(initialProf);
                setDoc(docRef, initialProf, { merge: true }).catch((e) =>
                  console.warn('Profile background sync:', e)
                );
                // Seed POLARX relational database collections if empty
                seedPolarxDatabaseIfEmpty(user.uid).catch((err) =>
                  console.warn('Relational seeding check:', err)
                );
              }
              setLoading(false);
            },
            (err) => {
              console.warn('User profile listener notice:', err);
              // Ensure we retain our provisional profile
              setUserProfile((prev) => prev || initialProf);
              setLoading(false);
            }
          );
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          if (unsubscribeFirestore) {
            unsubscribeFirestore();
            unsubscribeFirestore = null;
          }
          setLoading(false);
        }
      },
      (authErr) => {
        console.error('Firebase Auth state error:', authErr);
        setError(authErr.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const register = async (
    fullName: string,
    email: string,
    pass: string,
    role: FirebaseUserRole,
    organization?: string
  ): Promise<FirestoreUserProfile> => {
    setError(null);
    try {
      const profile = await registerWithEmail(fullName, email, pass, role, organization);
      setUserProfile(profile);
      return profile;
    } catch (err: any) {
      const msg = err?.message || 'Registration failed';
      setError(msg);
      throw err;
    }
  };

  const login = async (
    email: string,
    pass: string,
    rememberMe: boolean = true
  ): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> => {
    setError(null);
    try {
      const result = await loginWithEmail(email, pass, rememberMe);
      setCurrentUser(result.user);
      setUserProfile(result.profile);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed';
      setError(msg);
      throw err;
    }
  };

  const loginGoogle = async (): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> => {
    setError(null);
    try {
      const result = await loginWithGoogle();
      setCurrentUser(result.user);
      setUserProfile(result.profile);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Google authentication failed';
      setError(msg);
      throw err;
    }
  };

  const loginDemoGuest = async (): Promise<{ user: FirebaseUser; profile: FirestoreUserProfile }> => {
    setError(null);
    try {
      const result = await loginGuest();
      setCurrentUser(result.user);
      setUserProfile(result.profile);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Guest session initialization failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
    } catch (err: any) {
      const msg = err?.message || 'Logout failed';
      setError(msg);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (err: any) {
      const msg = err?.message || 'Failed to send password reset email';
      setError(msg);
      throw err;
    }
  };

  const refreshProfile = async (): Promise<void> => {
    if (!currentUser) return;
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) setUserProfile(profile);
    } catch (err: any) {
      console.warn('Failed to refresh profile:', err);
    }
  };

  const isRouteAllowed = (route: string): boolean => {
    return checkRouteAllowed(userProfile?.role, route);
  };

  const allowedRoutes = getRoleAllowedRoutes(userProfile?.role);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        error,
        register,
        login,
        loginGoogle,
        loginDemoGuest,
        logout,
        resetPassword,
        refreshProfile,
        isRouteAllowed,
        allowedRoutes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
