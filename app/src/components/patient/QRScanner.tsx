/**
 * QR Scanner Component
 *
 * Camera-based QR code scanner using html5-qrcode library.
 * Detects QR codes and extracts the short code for form navigation.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (shortCode: string) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
}

export default function QRScanner({
  onScanSuccess,
  onScanError,
  onClose,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      try {
        // Check if we're in a secure context (HTTPS or localhost)
        const isSecureContext = window.isSecureContext;

        // Check if mediaDevices API is available
        // On iOS Safari, this requires HTTPS and may not be available in all contexts
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          let errorMessage = "Camera access is not available.";

          if (!isSecureContext) {
            errorMessage = "Camera requires a secure connection (HTTPS). Please access this page via HTTPS.";
          } else {
            // iOS Safari specific messaging
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
              errorMessage = "Camera access is not available. On iOS, please ensure you're using Safari and the site is served over HTTPS.";
            }
          }

          throw new Error(errorMessage);
        }

        // Check for camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());

        if (!mounted) return;
        setHasPermission(true);

        // Initialize scanner
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" }, // Prefer back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            // Extract short code from URL
            // Expected format: https://chkin.co.za/c/[shortCode] or /c/[shortCode]
            const match = decodedText.match(/\/c\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              // Stop scanner before navigating
              scanner.stop().catch(console.error);
              onScanSuccess(match[1]);
            } else {
              // Not a valid Chkin QR code
              console.log("Scanned non-Chkin QR:", decodedText);
            }
          },
          (errorMessage) => {
            // Scan errors are normal (no QR in frame), ignore them
            // Only report actual errors
            if (errorMessage.includes("NotFoundException")) {
              return;
            }
            console.debug("Scan error:", errorMessage);
          }
        );

        if (mounted) {
          setIsInitializing(false);
        }
      } catch (err) {
        if (!mounted) return;

        console.error("Scanner init error:", err);
        setIsInitializing(false);

        if (err instanceof Error) {
          if (
            err.name === "NotAllowedError" ||
            err.message.includes("Permission denied")
          ) {
            setHasPermission(false);
            setError("Camera access denied. Please enable camera permissions.");
          } else if (err.name === "NotFoundError") {
            setError("No camera found on this device.");
          } else if (err.name === "NotReadableError") {
            setError("Camera is in use by another application.");
          } else if (err.name === "OverconstrainedError") {
            setError("No suitable camera found.");
          } else {
            setError(err.message || "Failed to start camera.");
          }
        } else {
          setError("Failed to start camera.");
        }

        onScanError?.("Scanner initialization failed");
      }
    };

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
          scanner.stop().catch(console.error);
        }
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          aria-label="Close scanner"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}

      {/* Loading state */}
      {isInitializing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="mt-4 text-white">Starting camera...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black p-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-white">{error}</p>
          {hasPermission === false && (
            <p className="mt-2 text-sm text-gray-400">
              Check your browser settings to allow camera access.
            </p>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-teal-600 px-6 py-2 text-white hover:bg-teal-700"
            >
              Go Back
            </button>
          )}
        </div>
      )}

      {/* Scanner viewport */}
      <div
        id="qr-reader"
        className="w-full max-w-md"
        style={{ minHeight: "300px" }}
      />

      {/* Scan instructions */}
      {!error && !isInitializing && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-white/80">Point camera at a Chkin QR code</p>
        </div>
      )}

      {/* Viewfinder overlay */}
      {!error && !isInitializing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-64 w-64">
            {/* Corner brackets */}
            <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-teal-500" />
            <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-teal-500" />
            <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-teal-500" />
            <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-teal-500" />
          </div>
        </div>
      )}
    </div>
  );
}
