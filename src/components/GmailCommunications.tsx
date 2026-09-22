/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * POLARX Gmail Communications Center Component
 */

import React, { useState, useEffect } from 'react';
import {
  connectGmailAccount,
  getGmailAccessToken,
  fetchGmailProfile,
  listGmailMessages,
  getGmailMessageDetails,
  sendGmailMessage,
  trashGmailMessage,
  GmailProfile,
  GmailMessageSummary,
} from '../services/gmailService';
import { useAuth } from '../context/AuthContext';

interface GmailCommunicationsProps {
  onToast: (title: string, message: string, icon?: string, color?: 'green' | 'amber' | 'red' | 'blue') => void;
}

export const GmailCommunications: React.FC<GmailCommunicationsProps> = ({ onToast }) => {
  const { userProfile } = useAuth();

  const [accessToken, setAccessToken] = useState<string | null>(getGmailAccessToken());
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');

  // Compose State
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyText, setBodyText] = useState<string>('');

  // Confirmation Modals
  const [showSendConfirmation, setShowSendConfirmation] = useState<boolean>(false);
  const [showTrashConfirmation, setShowTrashConfirmation] = useState<boolean>(false);
  const [messageToTrash, setMessageToTrash] = useState<GmailMessageSummary | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Initialize or check token
  useEffect(() => {
    const currentToken = getGmailAccessToken();
    setAccessToken(currentToken);
    if (currentToken) {
      loadGmailData(currentToken);
    }
  }, []);

  const loadGmailData = async (token: string, query: string = searchQuery) => {
    setIsLoading(true);
    try {
      const [profileData, msgList] = await Promise.all([
        fetchGmailProfile(token),
        listGmailMessages(token, query, 12),
      ]);
      setGmailProfile(profileData);
      setMessages(msgList);
      if (msgList.length > 0 && !selectedMessage) {
        setSelectedMessage(msgList[0]);
      }
    } catch (err: any) {
      console.error('Failed to load Gmail data:', err);
      onToast('Gmail Sync Warning', err?.message || 'Could not fetch Gmail messages.', 'warning', 'amber');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      const token = await connectGmailAccount();
      setAccessToken(token);
      onToast('Gmail Connected', 'Successfully authorized POLARX Gmail Workspace integration.', 'mark_email_read', 'green');
      await loadGmailData(token);
    } catch (err: any) {
      console.error('Connect Gmail failed:', err);
      onToast('Gmail Authorization Failed', err?.message || 'Failed to authenticate with Google.', 'error', 'amber');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessToken) {
      loadGmailData(accessToken, searchQuery);
    }
  };

  const applyTemplate = (templateType: 'daily_update' | 'logistics_request' | 'emergency_notice') => {
    const station = userProfile?.station || 'Bharati Station';
    const userRole = userProfile?.role || 'EXPEDITION_OFFICER';

    if (templateType === 'daily_update') {
      setSubject(`[POLARX STATUS] Daily Expedition Update - ${station}`);
      setBodyText(
        `NCPOR Polar Command,\n\nDaily Operational Status for ${station}:\n- Weather Conditions: Clear, -24°C, Wind 14 kts\n- Station Power & Life Support: 100% Operational\n- Scientific Array: Telemetry active and synced\n- Personnel Status: All field teams accounted for\n\nCommander/Officer: ${userProfile?.displayName || 'Polar Operator'} (${userRole})`
      );
    } else if (templateType === 'logistics_request') {
      setSubject(`[LOGISTICS REQUISITION] Urgent Fuel & Provisions Request - ${station}`);
      setBodyText(
        `To NCPOR Logistics Division,\n\nPlease log the following priority supply requisition for ${station}:\n- Jet-A1 Cold Fuel: 1,200 Liters\n- Deep-Freeze Rations: 40 Units\n- Medical Oxygen Cylinders: 4 Units\n\nRequired Delivery ETA: Next Vessel/Flight Window\n\nSigned,\n${userProfile?.displayName || 'Polar Commander'}`
      );
    } else if (templateType === 'emergency_notice') {
      setSubject(`[EMERGENCY ALERT] Polar Ops Incident Notification - ${station}`);
      setBodyText(
        `URGENT: POLARX EMERGENCY DISPATCH\n\nStation: ${station}\nSeverity: HIGH\nDescription: Unexpected katabatic wind squall registered at Outpost Alpha. Personnel safely sheltered in emergency polar pod.\n\nImmediate Actions Taken: Secondary beacon broadcast activated.\n\nContact: ${userProfile?.email || 'station.commander@polarx.org'}`
      );
    }
    setActiveTab('compose');
  };

  const triggerSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !bodyText.trim()) {
      onToast('Missing Fields', 'Please fill in recipient, subject, and message body.', 'warning', 'amber');
      return;
    }
    // Show mandatory user confirmation dialog for Gmail mutation/send
    setShowSendConfirmation(true);
  };

  const confirmAndSendEmail = async () => {
    if (!accessToken) {
      onToast('Auth Required', 'Please connect your Gmail account first.', 'key', 'amber');
      return;
    }

    setIsSending(true);
    try {
      await sendGmailMessage(
        accessToken,
        recipient.trim(),
        subject.trim(),
        bodyText.trim(),
        gmailProfile?.emailAddress
      );

      setShowSendConfirmation(false);
      onToast('Email Sent via Gmail', `Successfully dispatched email to ${recipient}`, 'send', 'green');
      
      // Reset compose form
      setRecipient('');
      setSubject('');
      setBodyText('');
      setActiveTab('inbox');

      // Refresh inbox list
      loadGmailData(accessToken);
    } catch (err: any) {
      console.error('Send Gmail failed:', err);
      onToast('Email Dispatch Failed', err?.message || 'Could not send email via Gmail API.', 'error', 'amber');
    } finally {
      setIsSending(false);
    }
  };

  const triggerTrashMessage = (msg: GmailMessageSummary, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMessageToTrash(msg);
    setShowTrashConfirmation(true);
  };

  const confirmAndTrashMessage = async () => {
    if (!accessToken || !messageToTrash) return;

    try {
      await trashGmailMessage(accessToken, messageToTrash.id);
      onToast('Moved to Trash', 'Email moved to Gmail Trash.', 'delete', 'amber');

      setShowTrashConfirmation(false);
      setMessageToTrash(null);

      if (selectedMessage?.id === messageToTrash.id) {
        setSelectedMessage(null);
      }

      loadGmailData(accessToken);
    } catch (err: any) {
      console.error('Trash Gmail failed:', err);
      onToast('Trash Failed', err?.message || 'Could not move email to trash.', 'error', 'amber');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#031120] text-slate-100 rounded-2xl border border-[#132c45] shadow-2xl overflow-hidden">
      {/* Header Bar */}
      <div className="bg-[#06182e] px-6 py-4 border-b border-[#132c45] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <span className="material-symbols-outlined text-[24px]">mail</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-lg text-white tracking-wide">
                POLARX Gmail Workspace Dispatch
              </h2>
              {accessToken ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                  ACTIVE GMAIL SESSION
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                  DISCONNECTED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {gmailProfile?.emailAddress ? (
                <>Connected as: <span className="text-blue-300 font-mono">{gmailProfile.emailAddress}</span> ({gmailProfile.messagesTotal} total messages)</>
              ) : (
                'Official Google Workspace Gmail API integration for polar expedition communications'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {accessToken ? (
            <>
              <button
                type="button"
                onClick={() => loadGmailData(accessToken)}
                disabled={isLoading}
                className="px-3 py-2 bg-[#0a233d] hover:bg-[#103052] border border-[#1d436c] rounded-xl text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>Sync Inbox</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-headline text-xs font-bold rounded-xl shadow-lg shadow-red-950/40 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Compose Email</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isConnecting ? 'Connecting Google Account...' : 'Sign in with Google (Gmail)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {!accessToken ? (
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#031120] to-[#010811]">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl">
            <span className="material-symbols-outlined text-[48px]">mail_lock</span>
          </div>
          <h3 className="text-xl font-headline font-bold text-white mb-2">
            Gmail Workspace Integration
          </h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Connect your Gmail account to communicate with NCPOR headquarters, dispatch expedition status updates, and manage polar logistics correspondence directly inside POLARX.
          </p>
          <button
            type="button"
            onClick={handleConnectGmail}
            disabled={isConnecting}
            className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-3 active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{isConnecting ? 'Authorizing Gmail Access...' : 'Connect Gmail Account'}</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Panel: Navigation & Email List */}
          <div className="w-full md:w-80 border-r border-[#132c45] flex flex-col bg-[#041527]">
            {/* View Tabs & Quick Search */}
            <div className="p-3 border-b border-[#132c45] space-y-2">
              <div className="flex bg-[#020b14] p-1 rounded-xl border border-[#132c45]">
                <button
                  type="button"
                  onClick={() => setActiveTab('inbox')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'inbox'
                      ? 'bg-[#0f2e4d] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">inbox</span>
                  <span>Inbox</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('compose')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'compose'
                      ? 'bg-[#0f2e4d] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Compose</span>
                </button>
              </div>

              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Filter Gmail messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#020b14] text-xs text-slate-200 pl-8 pr-3 py-2 rounded-xl border border-[#132c45] focus:outline-none focus:border-blue-500/50"
                />
                <span className="material-symbols-outlined text-[16px] text-slate-500 absolute left-2.5 top-2.5">
                  search
                </span>
              </form>

              {/* Quick Template Short Chips */}
              <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => applyTemplate('daily_update')}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#082038] hover:bg-[#0e3052] text-blue-300 border border-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  + Daily Status
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('logistics_request')}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#082038] hover:bg-[#0e3052] text-amber-300 border border-amber-500/20 whitespace-nowrap cursor-pointer"
                >
                  + Fuel Request
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('emergency_notice')}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#082038] hover:bg-[#0e3052] text-rose-300 border border-rose-500/20 whitespace-nowrap cursor-pointer"
                >
                  + Emergency
                </button>
              </div>
            </div>

            {/* Email Message List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#10273e]">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] animate-spin text-blue-400">
                    sync
                  </span>
                  <span>Fetching Gmail inbox...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-[28px] text-slate-600 mb-1">
                    mail_outline
                  </span>
                  <p>No messages match query</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setActiveTab('inbox');
                    }}
                    className={`p-3 cursor-pointer transition-colors relative ${
                      selectedMessage?.id === msg.id
                        ? 'bg-[#0a2745] border-l-4 border-blue-400'
                        : 'hover:bg-[#071c32]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[170px]">
                        {msg.from || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {msg.date ? new Date(msg.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-slate-300 truncate mb-1">
                      {msg.isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5"></span>
                      )}
                      {msg.subject || '(No Subject)'}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {msg.snippet}
                    </p>

                    <button
                      type="button"
                      onClick={(e) => triggerTrashMessage(msg, e)}
                      title="Trash email"
                      className="absolute right-2 bottom-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Reader or Composer */}
          <div className="flex-1 bg-[#020d18] flex flex-col overflow-hidden">
            {activeTab === 'compose' ? (
              /* Compose View */
              <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#132c45]">
                  <div>
                    <h3 className="font-headline font-bold text-base text-white">
                      Compose Gmail Message
                    </h3>
                    <p className="text-xs text-slate-400">
                      Send official expedition correspondence through your connected Gmail account
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inbox')}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={triggerSendEmail} className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      To (Recipient Email):
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. logistics@ncpor.gov.in, commander@polarx.org"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full bg-[#041527] border border-[#132c45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Subject:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="[POLARX STATUS] Operational Briefing"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-[#041527] border border-[#132c45] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Message Body:
                    </label>
                    <textarea
                      required
                      rows={10}
                      placeholder="Enter polar expedition dispatch details..."
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="w-full flex-1 bg-[#041527] border border-[#132c45] rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                    ></textarea>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('inbox')}
                      className="px-4 py-2 bg-[#091f36] hover:bg-[#0e2a4a] text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
                    >
                      Discard Draft
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-headline text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Review & Send Email</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedMessage ? (
              /* Message Reader View */
              <div className="flex-1 p-6 flex flex-col overflow-y-auto">
                <div className="pb-4 border-b border-[#132c45] mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-headline font-bold text-white mb-1">
                      {selectedMessage.subject}
                    </h3>
                    <div className="text-xs text-slate-400 space-y-0.5 font-mono">
                      <div><span className="text-slate-500">From:</span> {selectedMessage.from}</div>
                      {selectedMessage.to && <div><span className="text-slate-500">To:</span> {selectedMessage.to}</div>}
                      <div><span className="text-slate-500">Date:</span> {selectedMessage.date}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(selectedMessage.from || '');
                        setSubject(`Re: ${selectedMessage.subject}`);
                        setBodyText(`\n\n--- Original Message ---\n${selectedMessage.body}`);
                        setActiveTab('compose');
                      }}
                      className="px-3 py-1.5 bg-[#0a2542] hover:bg-[#113257] text-xs font-medium text-blue-300 rounded-lg border border-blue-500/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">reply</span>
                      <span>Reply</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerTrashMessage(selectedMessage)}
                      className="px-3 py-1.5 bg-[#2b0c13] hover:bg-[#3d121b] text-xs font-medium text-rose-300 rounded-lg border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      <span>Trash</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-[#041527] p-4 rounded-xl border border-[#132c45] text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-y-auto">
                  {selectedMessage.body || selectedMessage.snippet}
                </div>
              </div>
            ) : (
              /* No message selected empty state */
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center text-slate-500">
                <span className="material-symbols-outlined text-[48px] text-slate-700 mb-2">
                  mark_email_read
                </span>
                <p className="text-xs">Select a Gmail message to read or click Compose to write a new email.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR SENDING EMAIL */}
      {showSendConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#06182e] border border-blue-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-4 text-blue-400">
              <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
              <div>
                <h3 className="font-headline font-bold text-lg text-white">
                  Confirm Email Dispatch
                </h3>
                <p className="text-xs text-slate-400">
                  Gmail API Workspace Integration Permission
                </p>
              </div>
            </div>

            <div className="bg-[#03101c] p-4 rounded-xl border border-[#102d4a] text-xs space-y-2 mb-6">
              <div>
                <span className="text-slate-400 font-semibold">Recipient: </span>
                <span className="text-blue-300 font-mono">{recipient}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Subject: </span>
                <span className="text-white font-medium">{subject}</span>
              </div>
              <div className="pt-2 border-t border-[#102d4a] text-slate-300 font-mono text-[11px] max-h-32 overflow-y-auto whitespace-pre-wrap">
                {bodyText}
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to send this email on your behalf using your connected Gmail account?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSendConfirmation(false)}
                disabled={isSending}
                className="px-4 py-2 bg-[#0c243d] hover:bg-[#123050] text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndSendEmail}
                disabled={isSending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-headline text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Confirm & Send Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY USER CONFIRMATION MODAL FOR TRASHING EMAIL */}
      {showTrashConfirmation && messageToTrash && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18080c] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              <div>
                <h3 className="font-headline font-bold text-lg text-white">
                  Move Email to Trash?
                </h3>
                <p className="text-xs text-rose-300/80">
                  Gmail Message Mutation Confirmation
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to move the message <span className="font-semibold text-white">"{messageToTrash.subject}"</span> to your Gmail Trash folder?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowTrashConfirmation(false);
                  setMessageToTrash(null);
                }}
                className="px-4 py-2 bg-[#2d1117] hover:bg-[#3d1820] text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndTrashMessage}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-headline text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Confirm Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
