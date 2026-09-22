/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * POLARX Gmail Workspace Integration Service
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase/config';

// In-memory token cache (never stored in localStorage/sessionStorage per workspace security constraints)
let inMemoryAccessToken: string | null = null;

export function setGmailAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

export function getGmailAccessToken(): string | null {
  return inMemoryAccessToken;
}

export async function connectGmailAccount(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  
  // Add Gmail API scopes
  provider.addScope('https://mail.google.com/');
  provider.addScope('https://www.googleapis.com/auth/gmail.send');
  provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
  provider.addScope('https://www.googleapis.com/auth/gmail.compose');
  provider.addScope('https://www.googleapis.com/auth/gmail.modify');

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  
  if (!credential?.accessToken) {
    throw new Error('Could not obtain OAuth access token from Google sign in');
  }

  setGmailAccessToken(credential.accessToken);
  return credential.accessToken;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
  isUnread?: boolean;
}

/**
 * Fetch Gmail user profile
 */
export async function fetchGmailProfile(accessToken: string): Promise<GmailProfile> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail Profile API Error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * List Gmail messages matching an optional query
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = '',
  maxResults: number = 15
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
  });
  if (query) {
    params.append('q', query);
  }

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail List Messages Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const messages: { id: string; threadId: string }[] = data.messages || [];

  if (messages.length === 0) {
    return [];
  }

  // Fetch details for each message in parallel
  const detailPromises = messages.map((m) => getGmailMessageDetails(accessToken, m.id));
  return Promise.all(detailPromises);
}

/**
 * Get detailed contents of a single message
 */
export async function getGmailMessageDetails(
  accessToken: string,
  messageId: string
): Promise<GmailMessageSummary> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Gmail Get Message Error (${res.status})`);
  }

  const data = await res.json();
  const headers: GmailHeader[] = data.payload?.headers || [];

  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

  const subject = getHeader('Subject') || '(No Subject)';
  const from = getHeader('From') || 'Unknown Sender';
  const to = getHeader('To') || '';
  const date = getHeader('Date') || '';
  const labelIds: string[] = data.labelIds || [];
  const isUnread = labelIds.includes('UNREAD');

  // Decode body
  let body = '';
  if (data.payload?.body?.data) {
    body = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    const textPart = data.payload.parts.find(
      (p: any) => p.mimeType === 'text/plain' || p.mimeType === 'text/html'
    );
    if (textPart?.body?.data) {
      body = decodeBase64Url(textPart.body.data);
    } else if (data.payload.parts[0]?.body?.data) {
      body = decodeBase64Url(data.payload.parts[0].body.data);
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    subject,
    from,
    to,
    date,
    body: body || data.snippet,
    isUnread,
  };
}

/**
 * Helper to decode base64url strings from Gmail API
 */
function decodeBase64Url(input: string): string {
  try {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    // Handle UTF-8 decoding
    return decodeURIComponent(
      Array.prototype.map
        .call(decoded, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return input;
  }
}

/**
 * Construct raw MIME email string encoded in base64url format
 */
function makeRawEmail(to: string, subject: string, body: string, from?: string): string {
  const lines = [
    `To: ${to}`,
    from ? `From: ${from}` : '',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].filter(Boolean);

  const emailText = lines.join('\r\n');
  return btoa(unescape(encodeURIComponent(emailText)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email message using Gmail API
 */
export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  from?: string
): Promise<{ id: string; threadId: string }> {
  const raw = makeRawEmail(to, subject, body, from);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail Send Error (${res.status}): ${errText}`);
  }

  return res.json();
}

/**
 * Move a Gmail message to Trash
 */
export async function trashGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail Trash Error (${res.status}): ${errText}`);
  }
}
