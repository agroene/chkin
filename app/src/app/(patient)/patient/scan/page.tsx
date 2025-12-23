/**
 * Patient QR Scanner Page
 *
 * Full-screen camera view for scanning Chkin QR codes.
 * Extracts short code and navigates to the form.
 */

"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with camera APIs
const QRScanner = dynamic(
  () => import("@/components/patient/QRScanner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="text-white">Loading scanner...</p>
        </div>
      </div>
    ),
  }
);

export default function PatientScanPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Handle successful scan
  const handleScanSuccess = (shortCode: string) => {
    setScanSuccess(shortCode);
    // Navigate to the form with the short code
    // The form will pre-fill with vault data since user is authenticated
    router.push(`/c/${shortCode}`);
  };

  // Handle scan error
  const handleScanError = (error: string) => {
    console.error("Scan error:", error);
  };

  // Handle close - go back to dashboard
  const handleClose = () => {
    router.push("/patient");
  };

  // Loading state
  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  // Success state (brief flash before navigation)
  if (scanSuccess) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-black">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-500">
          <svg
            className="h-8 w-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-xl font-semibold text-white">QR Code Detected!</p>
        <p className="mt-2 text-gray-400">Opening form...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <QRScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={handleClose}
      />
    </div>
  );
}
