/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  QrCode,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { CargoAsset } from '../types';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (assetId: string) => void;
  onOpenRegisterAsset?: (prefilledId: string) => void;
  onSelectAsset?: (asset: CargoAsset) => void;
}

type CameraState =
  | 'idle'
  | 'requesting_permission'
  | 'permission_granted'
  | 'starting'
  | 'scanning'
  | 'error'
  | 'detected';

interface CameraErrorInfo {
  type:
    | 'permission_denied'
    | 'unavailable'
    | 'insecure_context'
    | 'in_use'
    | 'security_error'
    | 'overconstrained'
    | 'file_scan_failed'
    | 'generic';
  title: string;
  message: string;
  detail?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  onOpenRegisterAsset,
  onSelectAsset,
}) => {
  const dataCtx = useData();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // States
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Scanned result
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [detectedAsset, setDetectedAsset] = useState<CargoAsset | null>(null);

  // Manual code input
  const [manualInput, setManualInput] = useState('');
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);

  // Play tactical sound beep
  const playTacticalBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (_) {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch (_) {}
    }
  }, []);

  // Stop scanner instance cleanly
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping html5-qrcode scanner:', err);
      }
      scannerRef.current = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Handle successful QR detection
  const handleQrDetected = useCallback(
    (decodedText: string) => {
      if (!decodedText) return;

      playTacticalBeep();
      setScannedCode(decodedText);
      setCameraState('detected');

      // Stop camera once detected so user can review details
      stopScanner();

      // Look up asset in local DataContext
      const matched = dataCtx.lookupQrAsset(decodedText);
      if (matched) {
        setDetectedAsset(matched);
      } else {
        setDetectedAsset(null);
      }
    },
    [dataCtx, playTacticalBeep, stopScanner]
  );

  // Initialize and start live camera scanner
  const startCameraScanner = useCallback(
    async (preferCameraId?: string) => {
      setCameraError(null);
      setScannedCode(null);
      setDetectedAsset(null);

      // 1. Check insecure context (HTTP vs HTTPS)
      if (
        typeof window !== 'undefined' &&
        !window.isSecureContext &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        setCameraError({
          type: 'insecure_context',
          title: 'Insecure Context',
          message: 'Browser camera access requires HTTPS or localhost.',
          detail: 'Modern browser security protocols restrict media devices on unencrypted origins.',
        });
        setCameraState('error');
        return;
      }

      // 2. Check MediaDevices support
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError({
          type: 'unavailable',
          title: 'Camera API Unavailable',
          message: 'MediaDevices API is not supported on this browser or platform.',
          detail: 'Your browser environment does not support navigator.mediaDevices.getUserMedia.',
        });
        setCameraState('error');
        return;
      }

      // 3. Request camera permission via navigator.mediaDevices.getUserMedia()
      try {
        setCameraState('requesting_permission');

        // Request rear camera on mobile devices whenever possible
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        // Permission granted: release initial probe stream so Html5Qrcode can bind
        testStream.getTracks().forEach((track) => track.stop());
        setCameraState('permission_granted');
      } catch (err: any) {
        const name = err?.name || '';
        const msg = err?.message || '';

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError({
            type: 'permission_denied',
            title: 'Camera Permission Denied',
            message: 'POLARX camera permission was denied.',
            detail:
              'Please allow camera access in your browser or device site settings to scan asset QR codes.',
          });
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError({
            type: 'unavailable',
            title: 'No Camera Detected',
            message: 'No video capture hardware found on this system.',
            detail: 'Ensure a camera is connected or upload a QR image below.',
          });
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError({
            type: 'in_use',
            title: 'Camera Currently In Use',
            message: 'Camera is locked by another application or tab.',
            detail: 'Please close other apps or browser tabs using your camera and try again.',
          });
        } else if (name === 'SecurityError') {
          setCameraError({
            type: 'security_error',
            title: 'Security Policy Restriction',
            message: 'Camera access blocked by iframe policy.',
            detail: 'Ensure camera frame permissions are enabled for this origin.',
          });
        } else if (name === 'OverconstrainedError') {
          setCameraError({
            type: 'overconstrained',
            title: 'Resolution Overconstrained',
            message: 'Requested camera hardware constraint cannot be satisfied.',
            detail: 'Switching to default camera device...',
          });
        } else {
          setCameraError({
            type: 'generic',
            title: 'Camera Initialization Failed',
            message: msg || 'Unable to access device video stream.',
            detail: 'An unexpected media capture error occurred.',
          });
        }
        setCameraState('error');
        return;
      }

      // 4. Initialize Html5Qrcode on container element
      try {
        setCameraState('starting');

        // Ensure previous instance is cleared
        await stopScanner();

        // Small delay to ensure DOM element '#polarx-qr-reader' is mounted
        await new Promise((resolve) => setTimeout(resolve, 150));

        const readerElement = document.getElementById('polarx-qr-reader');
        if (!readerElement) {
          throw new Error('QR viewfinder element not found in DOM.');
        }

        const scanner = new Html5Qrcode('polarx-qr-reader', {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        // Query available video input devices
        const availableDevices = await Html5Qrcode.getCameras();
        setCameras(availableDevices || []);

        // Determine target camera configuration conforming strictly to Html5Qrcode specification
        // (cameraId string or { facingMode: "environment" | "user" })
        const targetCameraId = preferCameraId || selectedCameraId;
        let cameraConfig: string | { facingMode: string };
        let chosenLabel = '';

        if (targetCameraId && availableDevices?.some((d) => d.id === targetCameraId)) {
          cameraConfig = targetCameraId;
          const found = availableDevices.find((d) => d.id === targetCameraId);
          chosenLabel = found?.label || 'Selected Camera';
          setSelectedCameraId(targetCameraId);
        } else if (availableDevices && availableDevices.length > 0) {
          // Detect rear/environment camera by device label if available
          const backCamera = availableDevices.find((d) =>
            /(back|rear|environment|outer)/i.test(d.label || '')
          );
          if (backCamera) {
            cameraConfig = backCamera.id;
            chosenLabel = backCamera.label || 'Rear Camera (Environment)';
            setSelectedCameraId(backCamera.id);
          } else {
            // Default to first available hardware camera (e.g., desktop webcam)
            cameraConfig = availableDevices[0].id;
            chosenLabel = availableDevices[0].label || 'Default Camera';
            setSelectedCameraId(availableDevices[0].id);
          }
        } else {
          // Fallback to facingMode string accepted by Html5Qrcode
          cameraConfig = { facingMode: 'environment' };
          chosenLabel = 'Rear Camera (Environment)';
        }

        setActiveCameraLabel(chosenLabel);

        const scanConfig = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const box = Math.max(180, Math.min(280, Math.floor(minEdge * 0.72)));
            return { width: box, height: box };
          },
          aspectRatio: 1.0,
        };

        // Start scanning with high FPS and responsive viewfinder box
        try {
          await scanner.start(
            cameraConfig,
            scanConfig,
            (decodedText) => {
              handleQrDetected(decodedText);
            },
            () => {
              // Frame non-match, ignored
            }
          );
        } catch (initialErr: any) {
          console.warn('Initial camera start attempt failed, attempting fallback camera mode:', initialErr);
          // Fallback: If environment facing mode or specific camera failed, try user facing mode or first device
          if (availableDevices && availableDevices.length > 0 && cameraConfig !== availableDevices[0].id) {
            await scanner.start(
              availableDevices[0].id,
              scanConfig,
              (decodedText) => handleQrDetected(decodedText),
              () => {}
            );
            setActiveCameraLabel(availableDevices[0].label || 'Default Camera');
            setSelectedCameraId(availableDevices[0].id);
          } else {
            await scanner.start(
              { facingMode: 'user' },
              scanConfig,
              (decodedText) => handleQrDetected(decodedText),
              () => {}
            );
            setActiveCameraLabel('Front / Webcam');
          }
        }

        setCameraState('scanning');

        // Check if torch/flashlight capability is supported
        try {
          const capabilities = scanner.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) {
            setTorchAvailable(true);
          } else {
            setTorchAvailable(false);
          }
        } catch (_) {
          setTorchAvailable(false);
        }
      } catch (err: any) {
        console.error('Html5Qrcode start error:', err);
        setCameraError({
          type: 'generic',
          title: 'Scanner Initialization Error',
          message: err?.message || 'Could not start live QR scanner.',
          detail: 'Check camera permissions or select a different camera.',
        });
        setCameraState('error');
      }
    },
    [handleQrDetected, selectedCameraId, stopScanner]
  );

  // Toggle torch / flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !torchAvailable) return;
    try {
      const nextState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Switch camera device
  const handleSwitchCamera = async (newDeviceId: string) => {
    setSelectedCameraId(newDeviceId);
    await startCameraScanner(newDeviceId);
  };

  // Upload image file for scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraState('starting');
      await stopScanner();

      // Create temporary scanner instance if needed
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('polarx-qr-reader', { verbose: false });
        scannerRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleQrDetected(decodedText);
    } catch (err: any) {
      console.warn('File scan failed:', err);
      setCameraError({
        type: 'file_scan_failed',
        title: 'Image Scan Failed',
        message: 'No readable QR code or barcode found in this image.',
        detail: 'Please upload a clear image of an asset QR tag or use live camera.',
      });
      setCameraState('error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle manual input submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleQrDetected(manualInput.trim());
    setManualInput('');
    setIsManualInputOpen(false);
  };

  // Auto-start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCameraScanner();
    } else {
      stopScanner();
      setCameraState('idle');
      setCameraError(null);
      setScannedCode(null);
      setDetectedAsset(null);
      setIsManualInputOpen(false);
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startCameraScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      id="qrScannerModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="qrScannerModalContainer"
        className="bg-white dark:bg-[#0a1d2e] rounded-2xl border-2 border-neutral-900 dark:border-[#a4c9ff] shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] transition-all"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-[#253648] flex items-center justify-between bg-neutral-50 dark:bg-[#0f2132]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white dark:bg-[#0b5ea8] flex items-center justify-center shadow-sm">
              <QrCode className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-headline text-sm sm:text-base font-bold text-neutral-900 dark:text-[#d2e4fc]">
                Scan Asset QR
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-[#c1c6d3]">
                NCPOR Real-Time Optical Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {torchAvailable && cameraState === 'scanning' && (
              <button
                type="button"
                onClick={handleToggleTorch}
                title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                className={`p-2 rounded-lg transition-colors ${
                  torchOn
                    ? 'bg-amber-500 text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-[#1a2b3d] text-neutral-700 dark:text-[#d2e4fc]'
                }`}
              >
                {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-[#1a2b3d] text-neutral-500 dark:text-[#c1c6d3] transition-colors"
              aria-label="Close scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Informational Prompt Banner */}
        <div className="px-4 py-2 bg-neutral-100 dark:bg-[#071828] border-b border-neutral-200 dark:border-[#1a2b3d] flex items-center justify-between text-[11px]">
          <span className="font-mono text-neutral-700 dark:text-[#a4c9ff] flex items-center gap-1.5 truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                cameraState === 'scanning'
                  ? 'bg-emerald-500 animate-pulse'
                  : cameraState === 'detected'
                  ? 'bg-blue-500'
                  : cameraState === 'error'
                  ? 'bg-red-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="font-semibold truncate">
              {cameraState === 'requesting_permission' && 'Requesting Camera Permission...'}
              {cameraState === 'starting' && 'Starting Live Camera Feed...'}
              {cameraState === 'scanning' && 'LIVE CAMERA ACTIVE'}
              {cameraState === 'detected' && 'QR CODE DETECTED'}
              {cameraState === 'error' && 'CAMERA NOTICE'}
              {cameraState === 'idle' && 'READY'}
            </span>
          </span>

          {cameras.length > 1 && cameraState === 'scanning' && (
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              className="text-[10px] font-mono bg-white dark:bg-[#0f2132] text-neutral-800 dark:text-[#d2e4fc] border border-neutral-300 dark:border-[#253648] rounded px-1.5 py-0.5 outline-none"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Active Detected Result State */}
          {cameraState === 'detected' && scannedCode ? (
            <div className="w-full flex flex-col gap-3.5 animate-in zoom-in-95 duration-200">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">
                      Optical Match Verified
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-800/60 text-[9px] font-mono font-bold text-emerald-900 dark:text-emerald-200">
                      TAG SCAN
                    </span>
                  </div>
                  <p className="font-mono text-sm font-black text-neutral-900 dark:text-white mt-1 break-all">
                    {scannedCode}
                  </p>
                </div>
              </div>

              {/* Matched Asset Dossier Card */}
              {detectedAsset ? (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#0f2132] border border-neutral-200 dark:border-[#253648] flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-neutral-900 dark:text-[#a4c9ff]">
                          {detectedAsset.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                            detectedAsset.status === 'IN TRANSIT'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                              : detectedAsset.status === 'AT STATION'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                              : detectedAsset.status === 'DEPLOYED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          }`}
                        >
                          {detectedAsset.status}
                        </span>
                      </div>
                      <h4 className="font-headline text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                        {detectedAsset.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-neutral-400 block uppercase">Health</span>
                      <span className="font-mono font-bold text-sm text-neutral-900 dark:text-[#d2e4fc]">
                        {detectedAsset.healthPercent ?? detectedAsset.integrity ?? 100}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-neutral-200 dark:border-[#253648]">
                    <div>
                      <span className="text-neutral-400 block text-[9px] uppercase">Location</span>
                      <span className="text-neutral-800 dark:text-[#c1c6d3] font-semibold truncate block">
                        {detectedAsset.location}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-400 block text-[9px] uppercase">Destination</span>
                      <span className="text-neutral-800 dark:text-[#c1c6d3] font-semibold truncate block">
                        {detectedAsset.destination || detectedAsset.destStation || 'Bharati Station'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for matched asset */}
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectAsset) onSelectAsset(detectedAsset);
                        onScanSuccess(detectedAsset.id);
                        onClose();
                      }}
                      className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] dark:hover:bg-[#0a4e8d] text-white rounded-xl text-xs font-headline font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View in Cargo & Asset Intelligence</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCameraScanner()}
                      className="w-full py-2 px-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-[#1a2b3d] dark:hover:bg-[#253648] text-neutral-800 dark:text-[#d2e4fc] rounded-xl text-xs font-headline font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Scan Another Asset</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Unregistered Tag Card */
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-headline text-xs font-bold text-amber-900 dark:text-amber-300">
                        Asset Not Yet Registered
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-400">
                        This tag code does not match any existing item in local cache or cloud manifest.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    {onOpenRegisterAsset && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRegisterAsset(scannedCode);
                          onClose();
                        }}
                        className="w-full sm:flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <span>+ Register New Asset</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onScanSuccess(scannedCode);
                        onClose();
                      }}
                      className="w-full sm:flex-1 py-2 px-3 bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Use Tag ID</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => startCameraScanner()}
                    className="w-full py-1.5 text-xs text-neutral-600 dark:text-[#a4c9ff] hover:underline font-mono"
                  >
                    Scan Another QR Code
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Live Camera Viewfinder or Error State */
            <div className="w-full flex flex-col items-center gap-3">
              {/* Camera Frame Container */}
              <div
                id="cameraFrameContainer"
                className="relative w-full max-w-sm aspect-square bg-neutral-950 rounded-2xl border-2 border-neutral-300 dark:border-[#253648] overflow-hidden flex items-center justify-center shadow-inner"
              >
                {/* HTML5-QRCode Target Element */}
                <div
                  id="polarx-qr-reader"
                  className="w-full h-full flex items-center justify-center"
                />

                {/* Reticle / Live Overlay (Rendered when camera is live scanning) */}
                {cameraState === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Targeting Box */}
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                      {/* Corner Brackets */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Animated Laser Scanning Beam */}
                      <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />

                      {/* Reticle Center Crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <div className="w-8 h-0.5 bg-emerald-400" />
                        <div className="h-8 w-0.5 bg-emerald-400 -ml-4" />
                      </div>
                    </div>

                    {/* LIVE CAMERA BADGE */}
                    <div className="absolute top-3 left-3 bg-neutral-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-neutral-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                        LIVE CAMERA
                      </span>
                    </div>

                    {/* Camera Label */}
                    <div className="absolute bottom-3 bg-neutral-900/80 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] font-mono text-emerald-300 border border-emerald-500/40 truncate max-w-[85%]">
                      {activeCameraLabel || 'Rear Optical Sensor Active'}
                    </div>
                  </div>
                )}

                {/* Requesting Permission Overlay */}
                {cameraState === 'requesting_permission' && (
                  <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-6 text-center text-white gap-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/40 animate-pulse">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-headline text-sm font-bold">Requesting Camera Access</h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                        POLARX needs camera access to scan asset QR codes.
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-blue-300 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800">
                      Please allow camera permission in browser prompt
                    </div>
                  </div>
                )}

                {/* Camera Error Overlay */}
                {cameraState === 'error' && cameraError && (
                  <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-5 text-center text-white gap-3 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/40">
                      {cameraError.type === 'permission_denied' ? (
                        <ShieldAlert className="w-6 h-6 text-red-400" />
                      ) : (
                        <CameraOff className="w-6 h-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-headline text-sm font-bold text-red-300">
                        {cameraError.title}
                      </h4>
                      <p className="text-xs text-neutral-300 mt-1 max-w-xs">
                        {cameraError.message}
                      </p>
                      {cameraError.detail && (
                        <p className="text-[10px] text-neutral-400 font-mono mt-1.5 max-w-xs">
                          {cameraError.detail}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCameraScanner()}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold font-headline flex items-center gap-1 shadow-sm transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Camera</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Viewfinder Guidance Message as requested */}
              <p className="text-xs text-neutral-600 dark:text-[#c1c6d3] text-center font-medium">
                Align the QR code inside the scanning box.
              </p>

              {/* Fallback & Manual Entry Actions */}
              <div className="w-full space-y-2 pt-1">
                {/* Upload Image Fallback */}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="qr-image-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload QR Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManualInputOpen(!isManualInputOpen)}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] text-neutral-800 dark:text-[#d2e4fc] border border-neutral-300 dark:border-[#253648] text-xs font-headline font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Manual Code</span>
                  </button>
                </div>

                {/* Collapsible Manual Code Input */}
                {isManualInputOpen && (
                  <form
                    onSubmit={handleManualSubmit}
                    className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-[#071828] rounded-xl border border-neutral-200 dark:border-[#253648] animate-in fade-in duration-150"
                  >
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="e.g. POLAR-AX-1042 or tag token..."
                      className="flex-1 bg-white dark:bg-[#0f2132] text-neutral-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-mono border border-neutral-300 dark:border-[#253648] outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!manualInput.trim()}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-black dark:bg-[#0b5ea8] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      Resolve
                    </button>
                  </form>
                )}

                {/* Quick Simulation Tag Chips */}
                <div className="pt-1">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase block text-center mb-1.5 font-bold">
                    Quick Sample Tags:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQrDetected('POLAR-AX-1042')}
                      className="p-1.5 text-left rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] transition-colors"
                    >
                      <span className="font-mono text-[10px] font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                        POLAR-AX-1042
                      </span>
                      <span className="text-[9px] text-neutral-500 truncate block">
                        Heavy Snowcat Gen
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQrDetected('POLAR-MED-409')}
                      className="p-1.5 text-left rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-[#0f2132] dark:hover:bg-[#1a2b3d] border border-neutral-200 dark:border-[#253648] transition-colors"
                    >
                      <span className="font-mono text-[10px] font-bold text-neutral-900 dark:text-[#d2e4fc] block">
                        POLAR-MED-409
                      </span>
                      <span className="text-[9px] text-neutral-500 truncate block">
                        Cryo Med First Aid
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with CANCEL button as required */}
        <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-[#0f2132] border-t border-neutral-200 dark:border-[#253648] flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-500 dark:text-[#8b919c] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>NCPOR ENCRYPTED SCANNER</span>
          </span>

          <button
            id="cancelQrScanBtn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-[#1a2b3d] dark:hover:bg-[#253648] text-neutral-800 dark:text-[#d2e4fc] rounded-xl text-xs font-headline font-bold transition-all border border-neutral-300 dark:border-[#253648]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
