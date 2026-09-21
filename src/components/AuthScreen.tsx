/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FirebaseUserRole } from '../types';
import { PolarLogo } from './PolarLogo';
import { ROLE_DETAILS } from '../firebase/authService';

interface AuthScreenProps {
  onLoginSuccess?: () => void;
  onToast: (title: string, body: string, icon?: string, color?: 'green' | 'amber' | 'blue') => void;
  isOnline?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  onToast,
  isOnline = true,
}) => {
  const { login, loginGoogle, loginDemoGuest, register, resetPassword } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // Mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register inputs
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<FirebaseUserRole>('LOGISTICS_MANAGER');
  const [regOrganization, setRegOrganization] = useState(
    'NCPOR (National Centre for Polar and Ocean Research)'
  );

  // Forgot password inputs
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mission Control visual transition state: 'idle' | 'authenticating' | 'ready'
  const [authStep, setAuthStep] = useState<'idle' | 'authenticating' | 'ready'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Map Firebase Auth error codes to readable tactical messages
  const parseAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      case 'auth/user-disabled':
        return 'This terminal operator account has been deactivated.';
      case 'auth/user-not-found':
        return 'No registered account found with this email. Please register first.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid credentials. Check your email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters in length.';
      case 'auth/network-request-failed':
        return 'Sat-link connection error. Check your internet connectivity.';
      case 'auth/too-many-requests':
        return 'Access temporarily blocked due to repeated attempts. Try again shortly.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing verification.';
      case 'auth/popup-blocked':
        return 'Google sign-in popup was blocked by the browser. Please allow popups for this site.';
      case 'auth/cancelled-popup-request':
        return 'Previous Google sign-in request cancelled.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email using a different sign-in credential.';
      default:
        return err?.message || 'Authentication operation failed.';
    }
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    setAuthStep('authenticating');
    setStatusMessage('Initiating Google Identity Provider handshake with Firebase...');

    try {
      const result = await loginGoogle();
      setAuthStep('ready');
      const name = result.profile.displayName || result.profile.fullName || 'Operator';
      setStatusMessage(`Google Identity Verified: ${name} (${result.profile.role})`);

      setTimeout(() => {
        onToast(
          'GOOGLE SIGN-IN SUCCESS',
          `Welcome to POLARX, ${name}`,
          'verified_user',
          'green'
        );
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err: any) {
      setAuthStep('idle');
      const friendly = parseAuthError(err);
      setErrorMsg(friendly);
      onToast('GOOGLE AUTH FAILED', friendly, 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Demo Access Handler
  const handleInstantDemoAccess = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    setAuthStep('authenticating');
    setStatusMessage('Initializing Guest Expedition Commander session...');

    try {
      const result = await loginDemoGuest();
      setAuthStep('ready');
      setStatusMessage(`Commander Clearance Verified: ${result.profile.fullName}`);

      setTimeout(() => {
        onToast(
          'DEMO ACCESS GRANTED',
          `Welcome to POLARX Command Hub, ${result.profile.fullName}`,
          'verified_user',
          'green'
        );
        if (onLoginSuccess) onLoginSuccess();
      }, 400);
    } catch (err: any) {
      setAuthStep('idle');
      const friendly = parseAuthError(err);
      setErrorMsg(friendly);
      onToast('DEMO ACCESS ERROR', friendly, 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    setAuthStep('authenticating');
    setStatusMessage(`Verifying credentials with Firebase Auth & Cloud Firestore...`);

    try {
      const result = await login(loginEmail.trim(), loginPassword, rememberMe);
      setAuthStep('ready');
      setStatusMessage(`Clearance verified for ${result.profile.fullName} (${result.profile.role})`);

      setTimeout(() => {
        onToast(
          'ACCESS GRANTED',
          `Welcome to POLARX, ${result.profile.fullName}`,
          'verified_user',
          'green'
        );
        if (onLoginSuccess) onLoginSuccess();
      }, 500);
    } catch (err: any) {
      setAuthStep('idle');
      const friendly = parseAuthError(err);
      setErrorMsg(friendly);
      onToast('AUTHENTICATION FAILED', friendly, 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regFullName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsSubmitting(true);
    setAuthStep('authenticating');
    setStatusMessage(`Registering account and provisioning Firestore profile doc...`);

    try {
      const profile = await register(
        regFullName.trim(),
        regEmail.trim(),
        regPassword,
        regRole,
        regOrganization.trim()
      );

      setAuthStep('ready');
      setStatusMessage(`Registered UID: ${profile.uid} • Initializing Operations Center`);

      setTimeout(() => {
        onToast(
          'REGISTRATION COMPLETE',
          `Account created for ${profile.fullName} [${profile.role}]`,
          'badge',
          'green'
        );
        if (onLoginSuccess) onLoginSuccess();
      }, 550);
    } catch (err: any) {
      setAuthStep('idle');
      const friendly = parseAuthError(err);
      setErrorMsg(friendly);
      onToast('REGISTRATION FAILED', friendly, 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Reset Handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setForgotSuccess(false);

    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your account email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotSuccess(true);
      onToast('RESET DISPATCHED', 'Password reset instructions transmitted via email.', 'mail', 'green');
    } catch (err: any) {
      const friendly = parseAuthError(err);
      setErrorMsg(friendly);
      onToast('RESET FAILED', friendly, 'error', 'amber');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fast Test Preset Fill
  const fillPreset = (role: FirebaseUserRole, defaultName: string) => {
    const slug = role.toLowerCase().replace('_', '.');
    const testEmail = `${slug}@polarx.org`;
    const testPass = 'PolarX@2026';

    if (mode === 'login') {
      setLoginEmail(testEmail);
      setLoginPassword(testPass);
      setErrorMsg(null);
      onToast('PRESET POPULATED', `Filled ${testEmail}. If not registered yet, switch to Register.`, 'info', 'blue');
    } else if (mode === 'register') {
      setRegFullName(defaultName);
      setRegEmail(testEmail);
      setRegPassword(testPass);
      setRegConfirmPassword(testPass);
      setRegRole(role);
      setErrorMsg(null);
      onToast('REGISTRATION PRESET', `Ready to create ${role} account: ${testEmail}`, 'badge', 'blue');
    }
  };

  return (
    <div id="polarx-auth-screen" className="w-full max-w-xl mx-auto flex flex-col gap-4 py-4 px-3 sm:px-0">
      {/* Sat-Link & Firebase Live Status Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-neutral-100 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648] text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-700 dark:text-[#c1c6d3]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">FIREBASE CLOUD BACKEND CONNECTED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Sunlit Ice Light Mode' : 'Switch to Polar Night Dark Mode'}
            className="w-7 h-7 rounded-lg bg-white dark:bg-[#0f2132] hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] border border-neutral-300 dark:border-[#253648] text-neutral-700 dark:text-[#d2e4fc] flex items-center justify-center transition-colors shadow-sm"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-[15px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
              isOnline
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
          >
            {isOnline ? 'SAT-LINK ONLINE' : 'OFFLINE MODE'}
          </span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl p-6 sm:p-8 border-2 border-neutral-900 dark:border-[#253648] shadow-xl flex flex-col gap-6 relative overflow-hidden">
        {/* Full-Cover Transition Overlay */}
        {authStep !== 'idle' && (
          <div className="absolute inset-0 z-30 bg-white/95 dark:bg-[#0a1d2e]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center transition-opacity">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 dark:bg-[#0b5ea8] text-white flex items-center justify-center mb-4 shadow-lg">
              {authStep === 'authenticating' ? (
                <span className="material-symbols-outlined text-3xl animate-spin">
                  sync
                </span>
              ) : (
                <span className="material-symbols-outlined text-3xl text-emerald-400">
                  check_circle
                </span>
              )}
            </div>

            <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-[#c1c6d3]">
              POLARX TACTICAL GATEWAY
            </span>

            <h2 className="font-headline text-2xl font-black text-neutral-900 dark:text-[#d2e4fc] mt-1">
              {authStep === 'authenticating' ? 'Authenticating...' : 'Mission Control Ready'}
            </h2>

            <p className="font-mono text-xs text-neutral-600 dark:text-[#a4c9ff] mt-2 max-w-sm">
              {statusMessage}
            </p>

            <div className="w-48 h-1 bg-neutral-200 dark:bg-[#1a2b3d] rounded-full overflow-hidden mt-4">
              <div
                className={`h-full bg-black dark:bg-[#a4c9ff] transition-all duration-500 ${
                  authStep === 'authenticating' ? 'w-2/3' : 'w-full'
                }`}
              />
            </div>
          </div>
        )}

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3 flex items-center justify-center">
            <PolarLogo
              size="lg"
              animated={authStep === 'authenticating'}
              className="hover:scale-105 transition-transform"
            />
            <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-widest shadow">
              SIH26062
            </span>
          </div>

          <h1 className="font-headline text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 dark:text-[#d2e4fc]">
            POLARX
          </h1>
          <p className="font-label text-xs sm:text-sm uppercase tracking-wider text-neutral-800 dark:text-[#d2e4fc] font-bold mt-1 max-w-md">
            Integrated Polar Expedition Logistics & Asset Management System
          </p>
        </div>

        {/* Navigation Tabs between Sign In and Register */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-[#071A2B] rounded-xl border border-neutral-200 dark:border-[#253648]">
          <button
            type="button"
            id="auth-tab-login"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-headline font-bold uppercase tracking-wider rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-[#0a1d2e] text-neutral-900 dark:text-[#d2e4fc] shadow-sm'
                : 'text-neutral-500 dark:text-[#8b919c] hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            id="auth-tab-register"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-headline font-bold uppercase tracking-wider rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-[#0a1d2e] text-neutral-900 dark:text-[#d2e4fc] shadow-sm'
                : 'text-neutral-500 dark:text-[#8b919c] hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-red-600 dark:text-red-400">
              error
            </span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: SIGN IN */}
        {mode === 'login' && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1 text-left">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc] flex items-center justify-between">
                <span>Email</span>
                <span className="text-[10px] text-neutral-500 dark:text-[#c1c6d3] font-normal">
                  FIREBASE AUTH
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-neutral-400 dark:text-[#8b919c] text-[18px]">
                  mail
                </span>
                <input
                  id="login-email-input"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="operator@ncpor.res.in"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm pl-10 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center justify-between">
                <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setMode('forgot');
                    setErrorMsg(null);
                  }}
                  className="font-label text-xs text-blue-600 dark:text-[#a4c9ff] hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-neutral-400 dark:text-[#8b919c] text-[18px]">
                  lock
                </span>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-neutral-400 dark:text-[#8b919c] hover:text-black dark:hover:text-white"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs font-label">
              <label className="flex items-center gap-2 cursor-pointer select-none text-neutral-700 dark:text-[#c1c6d3]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-black dark:accent-[#a4c9ff] cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <span className="text-[11px] text-neutral-500 dark:text-[#8b919c]">
                Persistent Local Session
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN</span>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-0.5">
              <div className="flex-1 h-px bg-neutral-200 dark:bg-[#253648]" />
              <span className="text-[10px] font-mono text-neutral-400 dark:text-[#8b919c] uppercase tracking-wider">
                OR
              </span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-[#253648]" />
            </div>

            {/* Real Firebase Google Sign-In Button */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full bg-white hover:bg-neutral-50 dark:bg-[#0f2132] dark:hover:bg-[#162a3f] text-neutral-800 dark:text-[#d2e4fc] font-headline text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-[#253648] transition-all shadow-sm flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Instant Demo Access Button */}
            <button
              id="guest-demo-access-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleInstantDemoAccess}
              className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-[#07243e] dark:hover:bg-[#0b3356] text-blue-800 dark:text-[#a4c9ff] font-headline text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl border border-blue-200 dark:border-[#134978] transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-blue-600 dark:text-[#a4c9ff]">
                rocket_launch
              </span>
              <span>1-Click Express Demo Access (No Password)</span>
            </button>
          </form>
        )}

        {/* MODE 2: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
            {/* Full Name */}
            <div className="flex flex-col gap-1 text-left">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                Full Name
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-neutral-400 dark:text-[#8b919c] text-[18px]">
                  person
                </span>
                <input
                  id="reg-name-input"
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Commander Rajesh Nair"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm pl-10 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1 text-left">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-neutral-400 dark:text-[#8b919c] text-[18px]">
                  mail
                </span>
                <input
                  id="reg-email-input"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="user@polarx.org"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm pl-10 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 text-left">
                <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                  Password
                </label>
                <input
                  id="reg-password-input"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                  Confirm Password
                </label>
                <input
                  id="reg-confirm-password-input"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Operational Role Selector */}
            <div className="flex flex-col gap-1 text-left">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc] flex items-center justify-between">
                <span>Operational Role (Access Clearance)</span>
                <span className="text-[10px] text-blue-600 dark:text-[#a4c9ff] font-bold">
                  {regRole}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['ADMIN', 'LOGISTICS_MANAGER', 'EXPEDITION_OFFICER', 'RESEARCHER'] as FirebaseUserRole[]).map(
                  (roleKey) => {
                    const info = ROLE_DETAILS[roleKey];
                    const isSelected = regRole === roleKey;
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setRegRole(roleKey)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-neutral-900 dark:bg-[#0b5ea8] text-white border-neutral-900 dark:border-[#0b5ea8] shadow-sm'
                            : 'bg-neutral-50 dark:bg-[#0f2132] text-neutral-700 dark:text-[#c1c6d3] border-neutral-200 dark:border-[#253648] hover:border-neutral-400'
                        }`}
                      >
                        <div className="font-headline text-[11px] font-bold">{roleKey}</div>
                        <div
                          className={`text-[9.5px] truncate ${
                            isSelected ? 'text-neutral-200' : 'text-neutral-500 dark:text-[#8b919c]'
                          }`}
                        >
                          {info.label}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Organization */}
            <div className="flex flex-col gap-1 text-left">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                Organization / Directorate
              </label>
              <input
                id="reg-org-input"
                type="text"
                value={regOrganization}
                onChange={(e) => setRegOrganization(e.target.value)}
                placeholder="NCPOR"
                className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              id="reg-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white font-headline text-sm font-bold uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">
                    progress_activity
                  </span>
                  <span>CREATING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>CREATE POLARX ACCOUNT</span>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-0.5">
              <div className="flex-1 h-px bg-neutral-200 dark:bg-[#253648]" />
              <span className="text-[10px] font-mono text-neutral-400 dark:text-[#8b919c] uppercase tracking-wider">
                OR
              </span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-[#253648]" />
            </div>

            {/* Real Firebase Google Sign-In Button */}
            <button
              id="google-register-btn"
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full bg-white hover:bg-neutral-50 dark:bg-[#0f2132] dark:hover:bg-[#162a3f] text-neutral-800 dark:text-[#d2e4fc] font-headline text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-[#253648] transition-all shadow-sm flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4 text-left">
            <div>
              <h3 className="font-headline text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Recover Password
              </h3>
              <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] mt-1">
                Enter your registered POLARX email address. A password reset link will be dispatched by Firebase Auth.
              </p>
            </div>

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">
                  check_circle
                </span>
                <span>Password reset email dispatched. Check your inbox.</span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="font-label text-xs font-bold tracking-wider uppercase text-neutral-800 dark:text-[#d2e4fc]">
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-neutral-400 dark:text-[#8b919c] text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="operator@ncpor.res.in"
                  required
                  className="w-full bg-neutral-100 dark:bg-[#0f2132] text-neutral-900 dark:text-[#d2e4fc] font-mono text-xs sm:text-sm pl-10 pr-3 py-2.5 rounded-xl border border-neutral-300 dark:border-[#253648] focus:border-black dark:focus:border-[#a4c9ff] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-black hover:bg-neutral-800 dark:bg-[#0b5ea8] text-white font-headline text-xs font-bold uppercase tracking-widest py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>SEND RESET EMAIL</span>
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-[#253648] text-xs font-bold text-neutral-700 dark:text-[#c1c6d3] hover:bg-neutral-100 dark:hover:bg-[#0f2132]"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Quick Presets for Rapid Testing */}
        <div className="flex flex-col gap-3 pt-4 border-t border-neutral-200 dark:border-[#253648]">
          <div className="flex items-center gap-2">
            <div className="h-px bg-neutral-200 dark:bg-[#253648] flex-1" />
            <span className="font-headline text-xs uppercase tracking-widest font-bold text-neutral-800 dark:text-[#d2e4fc]">
              Quick Role Presets
            </span>
            <div className="h-px bg-neutral-200 dark:bg-[#253648] flex-1" />
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3] text-center">
            Click any role to pre-fill test credentials into the active form (Register or Sign In):
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => fillPreset('ADMIN', 'Commander V. K. Nair')}
              className="p-2 rounded-xl bg-neutral-50 dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] flex flex-col text-left transition-all"
            >
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 font-mono">
                ADMIN
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-[#c1c6d3] truncate">
                admin@polarx.org
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillPreset('LOGISTICS_MANAGER', 'Rohith Sai')}
              className="p-2 rounded-xl bg-neutral-50 dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] flex flex-col text-left transition-all"
            >
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                LOGISTICS
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-[#c1c6d3] truncate">
                logistics@polarx.org
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillPreset('EXPEDITION_OFFICER', 'Maj. Arjun Rathore')}
              className="p-2 rounded-xl bg-neutral-50 dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] flex flex-col text-left transition-all"
            >
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                OFFICER
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-[#c1c6d3] truncate">
                officer@polarx.org
              </span>
            </button>

            <button
              type="button"
              onClick={() => fillPreset('RESEARCHER', 'Dr. Maya Sen')}
              className="p-2 rounded-xl bg-neutral-50 dark:bg-[#0f2132] hover:bg-neutral-100 dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] flex flex-col text-left transition-all"
            >
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono">
                RESEARCHER
              </span>
              <span className="text-[10px] text-neutral-600 dark:text-[#c1c6d3] truncate">
                researcher@polarx.org
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
