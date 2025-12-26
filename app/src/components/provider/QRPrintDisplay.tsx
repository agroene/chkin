"use client";

/**
 * QR Print Display Component
 *
 * A beautifully designed A5 portrait display for printing QR codes.
 * Combines provider branding with clear call-to-action for patients.
 *
 * Design: Hybrid of "Invitation" and "Experience" concepts
 * - Provider logo prominently at top (their brand, their trust)
 * - Large, clean QR code as the hero element
 * - Simple action text with benefit statement
 * - 3-step visual indicator
 * - Chkin branding subtle at bottom
 *
 * A5 Portrait: 148mm × 210mm (5.83" × 8.27")
 */

interface A5ContentProps {
  qrImageDataUrl: string;
  shortCode: string;
  formTitle: string;
  organizationName: string;
  organizationLogo?: string | null;
  label?: string | null;
}

// Extracted as a separate component to avoid "component created during render" error
function A5Content({
  qrImageDataUrl,
  shortCode,
  formTitle,
  organizationName,
  organizationLogo,
  label,
}: A5ContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Teal Header Band */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10"
          style={{ background: "white" }}
        />
        <div
          className="absolute -left-4 -bottom-8 h-20 w-20 rounded-full opacity-10"
          style={{ background: "white" }}
        />

        {/* Provider Logo or Name */}
        <div className="relative text-center">
          {organizationLogo ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={organizationLogo}
                alt={organizationName}
                className="h-16 max-w-[200px] object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          ) : (
            <h1
              className="text-3xl font-bold text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              {organizationName}
            </h1>
          )}
          {/* Form title below provider name */}
          <p className="mt-2 text-sm text-teal-100">{formTitle}</p>
          {label && (
            <p className="mt-1 text-xs text-teal-200">({label})</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col justify-center px-6 py-5">
        {/* Welcome Text */}
        <div className="mb-5 text-center">
          <p
            className="text-lg text-gray-600"
            style={{ fontWeight: 500 }}
          >
            Welcome! Ready to check in?
          </p>
        </div>

        {/* QR Code Card */}
        <div className="mx-auto mb-5 max-w-[200px]">
          <div
            className="rounded-2xl bg-white p-4"
            style={{
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageDataUrl}
              alt="QR Code"
              className="h-auto w-full"
            />
            {/* Short code for troubleshooting - inside QR card */}
            <p className="mt-2 text-center font-mono text-[10px] text-gray-300">
              {shortCode}
            </p>
          </div>
        </div>

        {/* Action Text */}
        <div className="mb-5 text-center">
          <p
            className="text-xl font-semibold text-gray-900"
            style={{ letterSpacing: "-0.01em", paddingBottom: "50px" }}
          >
            Scan to Check In
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Skip the paperwork
          </p>
        </div>

        {/* 3-Step Visual */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-3">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "#f0fdfa" }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="mt-1 text-xs font-medium text-gray-600">
                Scan
              </span>
            </div>

            {/* Arrow */}
            <svg
              className="h-4 w-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "#f0fdfa" }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <span className="mt-1 text-xs font-medium text-gray-600">
                Fill
              </span>
            </div>

            {/* Arrow */}
            <svg
              className="h-4 w-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "#f0fdfa" }}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="mt-1 text-xs font-medium text-gray-600">
                Done
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer - Chkin Branding */}
      <div
        className="border-t px-6 py-4"
        style={{ borderColor: "#f3f4f6" }}
      >
        <div className="flex items-center justify-center">
          {/* Chkin Logo - h-[52px] is ~20% smaller than h-16 (64px) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Chkin - Share your info. Own your consent."
            className="w-auto"
            style={{ height: "52px" }}
          />
        </div>
      </div>
    </div>
  );
}

interface QRPrintDisplayProps {
  qrImageDataUrl: string;
  qrImageSvg?: string;
  shortCode: string;
  formUrl: string;
  formTitle: string;
  organizationName: string;
  organizationLogo?: string | null;
  label?: string | null;
  onClose: () => void;
}

export default function QRPrintDisplay({
  qrImageDataUrl,
  shortCode,
  formTitle,
  organizationName,
  organizationLogo,
  label,
  onClose,
}: QRPrintDisplayProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          /* Hide everything first */
          body * {
            visibility: hidden !important;
          }

          /* Show only the print container and its contents */
          #qr-print-container,
          #qr-print-container * {
            visibility: visible !important;
          }

          /* Position the print container */
          #qr-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Page setup for A5 */
          @page {
            size: A5 portrait;
            margin: 0;
          }

          /* Prevent any page breaks */
          html, body {
            height: 210mm !important;
            overflow: hidden !important;
          }
        }

        /* Screen styles */
        @media screen {
          .a5-preview-wrapper {
            /* Container that holds the scaled preview */
            width: 100%;
            max-width: 320px;
            aspect-ratio: 148 / 210;
            margin: 0 auto;
            overflow: hidden;
            position: relative;
          }

          .a5-preview-container {
            /* Render at actual A5 size in px (148mm x 210mm at 96dpi = 559px x 794px) */
            width: 559px;
            height: 794px;
            /* Scale down to fit the wrapper - 320px / 559px = 0.572 */
            transform: scale(0.572);
            transform-origin: top left;
            position: absolute;
            top: 0;
            left: 0;
          }

          /* Hide the print container on screen - use visibility not position */
          #qr-print-container {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
          }
        }
      `}</style>

      {/* Print-only container - visually hidden on screen, visible when printing */}
      <div
        id="qr-print-container"
        style={{
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          background: "white",
        }}
      >
        <A5Content
          qrImageDataUrl={qrImageDataUrl}
          shortCode={shortCode}
          formTitle={formTitle}
          organizationName={organizationName}
          organizationLogo={organizationLogo}
          label={label}
        />
      </div>

      {/* Modal Overlay - for screen preview only */}
      <div className="qr-modal-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
        <div className="flex max-h-[95vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl">
          {/* Modal Header - print controls */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Print Preview
              </h3>
              <p className="text-sm text-gray-500">
                A5 Portrait Display for Reception Desk
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
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
            </div>
          </div>

          {/* Print Preview Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            {/* A5 Preview Wrapper - maintains aspect ratio */}
            <div className="a5-preview-wrapper rounded-lg shadow-lg">
              {/* A5 Preview Container - rendered at actual A5 size, scaled down */}
              <div
                className="a5-preview-container bg-white"
                style={{
                  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
                }}
              >
                <A5Content
                  qrImageDataUrl={qrImageDataUrl}
                  shortCode={shortCode}
                  formTitle={formTitle}
                  organizationName={organizationName}
                  organizationLogo={organizationLogo}
                  label={label}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer - Tips */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900">Printing Tips</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                  <li>Select A5 paper size in your print settings</li>
                  <li>Use portrait orientation</li>
                  <li>Print at 100% scale (no fit-to-page)</li>
                  <li>Use quality paper for best QR scanning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
