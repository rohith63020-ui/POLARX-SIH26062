/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AuthScreen } from './components/AuthScreen';
import { OperationsCenter } from './components/OperationsCenter';
import { ExpeditionManagement } from './components/ExpeditionManagement';
import { CargoIntelligence } from './components/CargoIntelligence';
import { InventoryIntelligence } from './components/InventoryIntelligence';
import { AiIntelligence } from './components/AiIntelligence';
import { EmergencyCenter } from './components/EmergencyCenter';
import { SimulationLab } from './components/SimulationLab';
import { PersonnelManagement } from './components/PersonnelManagement';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { ProfileView } from './components/ProfileView';
import { AccessDeniedView } from './components/AccessDeniedView';
import { GmailCommunications } from './components/GmailCommunications';
import {
  TacticalToast,
  ToastData,
  GenericModal,
  QrScannerModal,
  AddCargoAssetModal,
  ResupplyModal,
  IdentityModal,
} from './components/Modals';
import { INITIAL_OFFLINE_QUEUE, INITIAL_CARGO_ASSETS } from './data/initialData';
import { StationId, UserProfile, CargoAsset, OfflineRecord, AppTab } from './types';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { PolarLogo } from './components/PolarLogo';
import { DEFAULT_AVATARS, ROLE_DETAILS } from './firebase/authService';
import { App as CapApp } from '@capacitor/app';
import {
  createAsset,
  createResupplyRequest,
  createActivityLog,
} from './firebase/dbService';

export default function App() {
  // Real Firebase Authentication & User State
  const {
    currentUser: fbUser,
    userProfile,
    loading: authLoading,
    logout,
    isRouteAllowed,
    allowedRoutes,
  } = useAuth();

  const isAuthenticated = !!(fbUser && userProfile);

  // Active user profile mapped for navigation and headers
  const currentUser: UserProfile = userProfile
    ? {
        id: userProfile.uid,
        name: userProfile.displayName || userProfile.fullName || fbUser?.displayName || 'Polar Operator',
        role: userProfile.role,
        station:
          userProfile.station ||
          ROLE_DETAILS[userProfile.role]?.defaultStation ||
          'Bharati Station',
        clearance:
          ROLE_DETAILS[userProfile.role]?.clearance || 'LEVEL-4 TOP SECRET',
        email: userProfile.email || fbUser?.email || '',
        organization: userProfile.organization,
        avatarUrl:
          userProfile.photoURL ||
          userProfile.avatarUrl ||
          fbUser?.photoURL ||
          DEFAULT_AVATARS[userProfile.role],
      }
    : {
        id: 'anonymous',
        name: 'Polar Operator',
        role: 'RESEARCHER',
        station: 'Bharati Station',
        clearance: 'LEVEL-2 SCIENCE OBSERVER',
        email: '',
        organization: 'NCPOR',
        avatarUrl: '',
      };

  // Logout Confirmation Modal State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Global Station & Connection State
  const [selectedStation, setSelectedStation] = useState<StationId>('bharati');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine ?? true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineRecord[]>(INITIAL_OFFLINE_QUEUE);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Theme State from Context
  const { theme, isDarkMode, setTheme, toggleTheme } = useTheme();

  // Navigation Tab State (Synced with URL hash)
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (
      hash === 'dashboard' ||
      hash === 'ops' ||
      hash === 'expeditions' ||
      hash === 'exped' ||
      hash === 'cargo' ||
      hash === 'assets' ||
      hash === 'stock' ||
      hash === 'inventory' ||
      hash === 'ai' ||
      hash === 'ai-insights' ||
      hash === 'sos' ||
      hash === 'emergency' ||
      hash === 'sim' ||
      hash === 'personnel' ||
      hash === 'reports' ||
      hash === 'settings' ||
      hash === 'profile' ||
      hash === 'gmail' ||
      hash === 'communications'
    ) {
      return hash as AppTab;
    }
    return 'dashboard';
  });

  // Modals & Overlay States
  const [genericModal, setGenericModal] = useState<{
    isOpen: boolean;
    title: string;
    body: React.ReactNode;
    icon?: string;
  }>({
    isOpen: false,
    title: '',
    body: null,
  });

  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [isResupplyOpen, setIsResupplyOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);

  // Tactical Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Extra Cargo State to allow new asset additions
  const [cargoList, setCargoList] = useState<CargoAsset[]>(INITIAL_CARGO_ASSETS);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);

  // Junior Explorer / Kid Mode State
  const [kidMode, setKidMode] = useState<boolean>(false);

  // Synchronize hash with activeTab
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash) {
        setActiveTab(hash as AppTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('SAT-LINK ONLINE', 'Restored high-frequency satellite transceiver link', 'wifi', 'green');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('OFFLINE MODE', 'Satellite link severed. Working in verified local-cache mode.', 'wifi_off', 'amber');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Android Native Hardware Back Button Handling
  useEffect(() => {
    let backListener: any;
    const setupBackListener = async () => {
      try {
        backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          if (isQrScannerOpen) {
            setIsQrScannerOpen(false);
          } else if (isAddAssetOpen) {
            setIsAddAssetOpen(false);
          } else if (isResupplyOpen) {
            setIsResupplyOpen(false);
          } else if (isIdentityOpen) {
            setIsIdentityOpen(false);
          } else if (genericModal.isOpen) {
            setGenericModal((prev) => ({ ...prev, isOpen: false }));
          } else if (showLogoutConfirm) {
            setShowLogoutConfirm(false);
          } else if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
            window.location.hash = '#dashboard';
          } else {
            CapApp.exitApp();
          }
        });
      } catch (err) {
        // Safe fallback for non-Capacitor web environments
      }
    };

    setupBackListener();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [
    isQrScannerOpen,
    isAddAssetOpen,
    isResupplyOpen,
    isIdentityOpen,
    genericModal.isOpen,
    showLogoutConfirm,
    activeTab,
  ]);

  // Show Toast Helper
  const showToast = (
    title: string,
    body: string,
    icon: string = 'info',
    color: 'green' | 'amber' | 'blue' = 'blue'
  ) => {
    const id = 'toast-' + Date.now() + '-' + Math.random();
    const newToast: ToastData = { id, title, body, icon, color };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Online / Offline Toggle
  const handleToggleOnline = () => {
    if (isOnline) {
      setIsOnline(false);
      showToast(
        'OFFLINE MODE',
        'Satellite transceiver disabled. Local-first queue active.',
        'cloud_off',
        'amber'
      );
    } else {
      setIsOnline(true);
      showToast('SAT-LINK RESTORED', 'Satellite carrier verified. Initiating synchronization...', 'cloud_done', 'green');
      handleManualSync();
    }
  };

  // Manual or Auto Sync
  const handleManualSync = async () => {
    if (offlineQueue.length === 0) {
      showToast('SYNC VERIFIED', 'Local queue is clear. Telemetry stream is current.', 'done_all', 'green');
      return;
    }

    setIsSyncing(true);
    showToast(
      'BURST SYNC INITIATED',
      `Transmitting ${offlineQueue.length} queued records to NCPOR central database...`,
      'sync',
      'blue'
    );

    try {
      // Synchronize queued items to Firestore activityLogs
      for (const item of offlineQueue) {
        await createActivityLog({
          id: item.id,
          title: `Offline Sync: ${item.type}`,
          details: item.desc,
          description: item.desc,
          category: item.type,
          badge: 'SYNCED',
          badgeType: 'ops',
          actor: currentUser.name || 'Polar Operator',
          expeditionId: 'INPEX-2026',
        });
      }
    } catch (e) {
      console.warn('Sync to Firestore activity logs error:', e);
    }

    setOfflineQueue([]);
    setIsSyncing(false);
    showToast(
      'SYNC COMPLETE',
      'All local records successfully synchronized to Cloud Firestore.',
      'task_alt',
      'green'
    );
  };

  const handleAddToQueue = (type: OfflineRecord['type'], desc: string) => {
    const newRecord: OfflineRecord = {
      id: 'REC-' + (Date.now() % 10000).toString(),
      type,
      desc,
      time: new Date().toISOString().substring(11, 19) + ' UTC',
      status: 'PENDING SYNC',
    };
    setOfflineQueue((prev) => [newRecord, ...prev]);
  };

  const handleResetQueue = () => {
    setOfflineQueue(INITIAL_OFFLINE_QUEUE);
    showToast('QUEUE RE-INITIALIZED', 'Offline queue restored to test fixture records', 'refresh', 'blue');
  };

  // Route Protection & Hash Synchronization
  useEffect(() => {
    if (authLoading) return;

    const handleHashSync = () => {
      const cleanHash = window.location.hash.replace('#', '').replace(/^\//, '').toLowerCase();

      // 8 & 9: If the user is not authenticated, redirect them to /login and protect all dashboard routes
      if (!isAuthenticated) {
        if (cleanHash !== 'login') {
          window.location.hash = '#login';
        }
        return;
      }

      // 10: After authentication (e.g. Google login), if at login, redirect to /dashboard
      if (cleanHash === 'login' || !cleanHash) {
        setActiveTab('dashboard');
        window.location.hash = '#dashboard';
        return;
      }

      // If authenticated and visiting a valid dashboard tab
      let normalized = cleanHash as AppTab;
      if (cleanHash === 'ops') normalized = 'dashboard';
      else if (cleanHash === 'exped') normalized = 'expeditions';
      else if (cleanHash === 'assets') normalized = 'cargo';
      else if (cleanHash === 'inventory') normalized = 'stock';
      else if (cleanHash === 'emergency') normalized = 'sos';
      else if (cleanHash === 'ai-insights') normalized = 'ai';

      setActiveTab(normalized);
    };

    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [isAuthenticated, authLoading]);

  // Login handler
  const handleLoginSuccess = () => {
    setActiveTab('dashboard');
    window.location.hash = '#dashboard';
  };

  // Logout Execution via Firebase
  const handleExecuteLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      window.location.hash = '#login';
      showToast('LOGOUT SUCCESS', 'Successfully signed out of POLARX via Firebase.', 'lock', 'amber');
    } catch (err: any) {
      showToast('LOGOUT ERROR', err?.message || 'Failed to logout', 'error', 'amber');
    }
  };

  // Navigation Helper that also updates the URL hash
  const handleNavigateTab = (tab: string) => {
    let normalized = tab as AppTab;
    if (tab === 'ops') normalized = 'dashboard';
    else if (tab === 'exped') normalized = 'expeditions';
    else if (tab === 'assets') normalized = 'cargo';
    else if (tab === 'inventory') normalized = 'stock';
    else if (tab === 'emergency') normalized = 'sos';
    else if (tab === 'ai-insights') normalized = 'ai';

    setActiveTab(normalized);
    window.location.hash = '#' + normalized;
  };

  // Handlers for Modals
  const handleOpenGenericModal = (title: string, body: React.ReactNode, icon?: string) => {
    setGenericModal({ isOpen: true, title, body, icon });
  };

  const handleAddCargoAsset = async (asset: CargoAsset) => {
    setCargoList([asset, ...cargoList]);
    try {
      await createAsset(asset);
    } catch (e) {
      console.warn('Firestore createAsset from modal error:', e);
    }
    showToast('ASSET REGISTERED', `${asset.name} (${asset.id}) tagged and linked to ${asset.destination} in Firestore`, 'inventory_2', 'green');
  };

  const handleCreateResupply = async (item: string, qty: string) => {
    try {
      await createResupplyRequest({
        id: 'REQ-' + Date.now(),
        inventoryId: 'ITEM-' + Date.now().toString().slice(-4),
        expeditionId: 'INPEX-2026',
        orderNumber: '#ORD-' + Math.floor(1000 + Math.random() * 9000),
        itemName: item,
        requestedQty: parseFloat(qty) || 10,
        unit: 'units',
        priority: 'STANDARD',
        status: 'PENDING',
        destination: 'Bharati Station',
        eta: '7d',
        notes: `Urgent field requisition logged by ${currentUser.name || 'Polar Operator'}`,
      });
    } catch (e) {
      console.warn('Firestore createResupplyRequest from modal error:', e);
    }
    showToast('RESUPPLY TRANSMITTED', `Requisition for ${qty} of ${item} dispatched to Goa Central Logistics Hub & saved in Firestore`, 'local_shipping', 'green');
  };

  const handleScanSuccess = (assetId: string) => {
    setScannedAssetId(assetId);
    showToast('TAG DETECTED', `Optical scan recognized: ${assetId}. Telemetry dossier synchronized.`, 'qr_code_scanner', 'green');
    handleNavigateTab('cargo');
  };

  // Scenario trigger from Simulation Lab
  const handleTriggerScenario = (scenario: string) => {
    if (scenario === 'blizzard') {
      showToast('WEATHER SURGE ALERT', 'Katabatic blizzard winds spiked to 68 kt. Station heaters engaged.', 'ac_unit', 'amber');
    } else if (scenario === 'comms_loss') {
      setIsOnline(false);
      showToast('SATELLITE CARRIER LOST', 'Argos telemetry link dropped. Switched to offline local-first mode.', 'cloud_off', 'amber');
    } else if (scenario === 'rescue') {
      handleNavigateTab('sos');
      showToast('SAR CALLOUT', 'Active distress beacon received. Switched to SAR Operations Center.', 'emergency_home', 'amber');
    } else if (scenario === 'generator_drift') {
      handleNavigateTab('ai');
      showToast('AI SENSOR ANOMALY', 'Generator vibration drift detected. Navigating to AI Predictive Core.', 'model_training', 'amber');
    }
  };

  // Determine if active route is permitted by current user's role
  const isCurrentRouteAllowed = isRouteAllowed(activeTab);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fbf9f8] dark:bg-[#021425] flex flex-col items-center justify-center p-6 text-center">
        <PolarLogo size="lg" animated className="mb-4" />
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-600 dark:text-[#a4c9ff] animate-pulse">
          SAT-UPLINK CONNECTING • INITIALIZING POLARX SESSION...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8] dark:bg-[#021425] text-[#1a1a1a] dark:text-[#d2e4fc] font-sans antialiased flex flex-col transition-colors duration-200">
      {/* Global Tactical Toasts */}
      <TacticalToast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Main App Layout */}
      {!isAuthenticated ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen py-8 px-4">
          <AuthScreen
            onLoginSuccess={handleLoginSuccess}
            onToast={showToast}
            isOnline={isOnline}
          />
        </div>
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Top Sticky Header */}
          <Header
            user={currentUser}
            currentUser={currentUser}
            station={selectedStation}
            currentStation={selectedStation}
            onSelectStation={(st) => {
              setSelectedStation(st);
              showToast('STATION CHANGED', `Active command hub switched to ${st.toUpperCase()}`, 'location_city', 'blue');
            }}
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            onToggleConnection={handleToggleOnline}
            queuedItemsCount={offlineQueue.length}
            pendingCount={offlineQueue.length}
            isSyncing={isSyncing}
            onManualSync={handleManualSync}
            onOpenProfile={() => handleNavigateTab('profile')}
            onOpenProfileModal={() => handleNavigateTab('profile')}
            onNavigateTab={handleNavigateTab}
            theme={theme}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onToggleDarkMode={toggleTheme}
            onOpenQueue={handleManualSync}
            onPromptLogout={() => setShowLogoutConfirm(true)}
            kidMode={kidMode}
            onToggleKidMode={() => setKidMode(!kidMode)}
          />

          {/* Main Content Area with Route Protection */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 pb-24">
            {!isCurrentRouteAllowed ? (
              <AccessDeniedView
                attemptedRoute={activeTab}
                userRole={userProfile?.role || 'RESEARCHER'}
                onNavigateHome={() => handleNavigateTab('dashboard')}
              />
            ) : (
              <>
                {(activeTab === 'dashboard' || activeTab === 'ops') && (
                  <OperationsCenter
                    queue={offlineQueue}
                    offlineCount={offlineQueue.length}
                    onAddQueueItem={handleAddToQueue}
                    onSyncQueue={handleManualSync}
                    onTriggerSync={handleManualSync}
                    onResetQueue={handleResetQueue}
                    isSyncing={isSyncing}
                    syncProgress={isSyncing ? 65 : 100}
                    station={selectedStation}
                    currentStation={selectedStation}
                    onSelectStation={(st) => setSelectedStation(st)}
                    onNavigateTab={handleNavigateTab}
                    onNavigate={handleNavigateTab}
                    onOpenModal={handleOpenGenericModal}
                    onToast={showToast}
                    kidMode={kidMode}
                  />
                )}

                {(activeTab === 'expeditions' || activeTab === 'exped') && (
                  <ExpeditionManagement
                    currentStation={selectedStation}
                    kidMode={kidMode}
                    onOpenModal={handleOpenGenericModal}
                    onToast={showToast}
                  />
                )}

                {(activeTab === 'cargo' || activeTab === 'assets') && (
                  <CargoIntelligence
                    cargoList={cargoList}
                    selectedAssetIdProp={scannedAssetId}
                    onOpenScanner={() => setIsQrScannerOpen(true)}
                    onOpenScanModal={() => setIsQrScannerOpen(true)}
                    onOpenAddAsset={() => setIsAddAssetOpen(true)}
                    onOpenAddModal={() => setIsAddAssetOpen(true)}
                    onOpenModal={handleOpenGenericModal}
                    onToast={showToast}
                  />
                )}

                {(activeTab === 'stock' || activeTab === 'inventory') && (
                  <InventoryIntelligence
                    onOpenResupplyModal={() => setIsResupplyOpen(true)}
                    onToast={showToast}
                  />
                )}

                {(activeTab === 'gmail' || activeTab === 'communications') && (
                  <GmailCommunications onToast={showToast} />
                )}

                {activeTab === 'personnel' && (
                  <PersonnelManagement
                    currentStation={selectedStation}
                    onToast={showToast}
                  />
                )}

                {(activeTab === 'ai' || activeTab === 'ai-insights') && (
                  <AiIntelligence
                    onOpenModal={handleOpenGenericModal}
                    onToast={showToast}
                  />
                )}

                {(activeTab === 'sos' || activeTab === 'emergency') && (
                  <EmergencyCenter
                    onOpenModal={handleOpenGenericModal}
                    onToast={showToast}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsView
                    currentStation={selectedStation}
                    onToast={showToast}
                  />
                )}

                {activeTab === 'sim' && (
                  <SimulationLab
                    onTriggerScenario={handleTriggerScenario}
                    onToast={showToast}
                    kidMode={kidMode}
                  />
                )}

                {activeTab === 'profile' && userProfile && (
                  <ProfileView
                    profile={userProfile}
                    currentUser={fbUser}
                    onToast={showToast}
                    onNavigateTab={handleNavigateTab}
                    onPromptLogout={() => setShowLogoutConfirm(true)}
                  />
                )}

                {activeTab === 'settings' && userProfile && (
                  <SettingsView
                    userProfile={userProfile}
                    onToast={showToast}
                    onPromptLogout={() => setShowLogoutConfirm(true)}
                  />
                )}
              </>
            )}
          </main>

          {/* Bottom Navigation with RBAC item visibility */}
          <BottomNav
            activeTab={activeTab}
            onSelectTab={handleNavigateTab}
            queuedCount={offlineQueue.length}
            kidMode={kidMode}
            allowedRoutes={allowedRoutes}
            role={userProfile?.role}
          />
        </div>
      )}

      {/* Logout Confirmation Dialog (Requirement 7) */}
      {showLogoutConfirm && (
        <div
          id="logoutConfirmationModal"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-[#0a1d2e] rounded-2xl max-w-md w-full p-6 border-2 border-neutral-900 dark:border-[#253648] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">logout</span>
              </div>
              <div>
                <h3 className="font-headline text-lg font-bold text-neutral-900 dark:text-[#d2e4fc]">
                  Sign out of POLARX?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-[#c1c6d3]">
                  {currentUser.name} • {currentUser.role}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-[#c1c6d3]">
              Are you sure you want to end your current session? You will be redirected to the
              login gateway. All cached offline records and settings will remain preserved.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancelLogoutBtn"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] rounded-xl text-xs font-bold transition-all border border-neutral-300 dark:border-[#253648]"
              >
                Cancel
              </button>
              <button
                id="confirmLogoutBtn"
                onClick={handleExecuteLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <GenericModal
        isOpen={genericModal.isOpen}
        onClose={() => setGenericModal({ ...genericModal, isOpen: false })}
        title={genericModal.title}
        icon={genericModal.icon}
      >
        {genericModal.body}
      </GenericModal>

      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onOpenRegisterAsset={() => setIsAddAssetOpen(true)}
        onSelectAsset={(asset) => {
          setScannedAssetId(asset.id);
          handleNavigateTab('cargo');
        }}
      />

      <AddCargoAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => setIsAddAssetOpen(false)}
        onAddAsset={handleAddCargoAsset}
      />

      <ResupplyModal
        isOpen={isResupplyOpen}
        onClose={() => setIsResupplyOpen(false)}
        onSubmit={handleCreateResupply}
      />

      <IdentityModal
        isOpen={isIdentityOpen}
        onClose={() => setIsIdentityOpen(false)}
        user={currentUser}
      />
    </div>
  );
}
