"use client";

/**
 * QR Codes Page
 *
 * Displays all QR codes for the provider's forms.
 * Allows generating, viewing, downloading, and managing QR codes.
 */

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import QRPrintDisplay from "@/components/provider/QRPrintDisplay";

interface Organization {
  id: string;
  name: string;
  logo: string | null;
}

interface QRCode {
  id: string;
  shortCode: string;
  label: string | null;
  isActive: boolean;
  scanCount: number;
  createdAt: string;
  lastScannedAt: string | null;
  formUrl: string;
  qrImageDataUrl?: string;
  qrImageSvg?: string;
  formTemplate: {
    id: string;
    title: string;
    isActive: boolean;
  };
  organization?: Organization;
}

interface FormTemplate {
  id: string;
  title: string;
  isActive: boolean;
  _count: {
    qrCodes: number;
  };
}

export default function QRCodesPage() {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [selectedQR, setSelectedQR] = useState<QRCode | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newFormId, setNewFormId] = useState("");
  const [generating, setGenerating] = useState(false);

  // Fetch forms and QR codes
  const fetchData = useCallback(async () => {
    try {
      // Fetch forms
      const formsResponse = await fetch("/api/provider/forms");
      if (!formsResponse.ok) throw new Error("Failed to load forms");
      const formsData = await formsResponse.json();
      setForms(formsData.forms || []);

      // Fetch QR codes for all forms
      const allQRCodes: QRCode[] = [];
      for (const form of formsData.forms || []) {
        const qrResponse = await fetch(`/api/provider/forms/${form.id}/qr`);
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          allQRCodes.push(
            ...qrData.qrCodes.map((qr: QRCode) => ({
              ...qr,
              formTemplate: {
                id: form.id,
                title: form.title,
                isActive: form.isActive,
              },
            }))
          );
        }
      }
      setQrCodes(allQRCodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate new QR code
  const handleGenerate = async () => {
    if (!newFormId) {
      setError("Please select a form");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/provider/forms/${newFormId}/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() || null }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate QR code");
      }

      const data = await response.json();
      const form = forms.find((f) => f.id === newFormId);

      setQrCodes((prev) => [
        {
          ...data.qrCode,
          formTemplate: {
            id: newFormId,
            title: form?.title || "Unknown Form",
            isActive: form?.isActive || false,
          },
        },
        ...prev,
      ]);
      setNewLabel("");
      setNewFormId("");
      setShowNewForm(false);
      // Auto-select the new QR code
      setSelectedQR({
        ...data.qrCode,
        formTemplate: {
          id: newFormId,
          title: form?.title || "Unknown Form",
          isActive: form?.isActive || false,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setGenerating(false);
    }
  };

  // Toggle QR code active status
  const handleToggleActive = async (qrCode: QRCode) => {
    try {
      const response = await fetch(
        `/api/provider/forms/${qrCode.formTemplate.id}/qr/${qrCode.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !qrCode.isActive }),
        }
      );

      if (!response.ok) throw new Error("Failed to update QR code");

      const data = await response.json();
      setQrCodes((prev) =>
        prev.map((qr) =>
          qr.id === qrCode.id
            ? { ...qr, ...data.qrCode }
            : qr
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update QR code");
    }
  };

  // View QR code details
  const handleViewQR = async (qrCode: QRCode) => {
    try {
      const response = await fetch(
        `/api/provider/forms/${qrCode.formTemplate.id}/qr/${qrCode.id}`
      );
      if (!response.ok) throw new Error("Failed to load QR code details");

      const data = await response.json();
      setSelectedQR({
        ...data.qrCode,
        formTemplate: qrCode.formTemplate,
        organization: data.organization,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QR code");
    }
  };

  // Open print preview modal
  const handlePrintPreview = () => {
    if (selectedQR) {
      setShowPrintModal(true);
    }
  };

  // Download QR code as PNG
  const handleDownloadPNG = () => {
    if (!selectedQR?.qrImageDataUrl) return;

    const link = document.createElement("a");
    link.download = `qr-${selectedQR.shortCode}.png`;
    link.href = selectedQR.qrImageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download QR code as SVG
  const handleDownloadSVG = () => {
    if (!selectedQR?.qrImageSvg) return;

    const blob = new Blob([selectedQR.qrImageSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `qr-${selectedQR.shortCode}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    if (!selectedQR) return;

    try {
      await navigator.clipboard.writeText(selectedQR.formUrl);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = selectedQR.formUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter QR codes by selected form
  const filteredQRCodes =
    selectedForm === "all"
      ? qrCodes
      : qrCodes.filter((qr) => qr.formTemplate.id === selectedForm);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="QR Codes"
        description="Generate and manage QR codes for your forms"
      >
        <button
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Generate QR Code
        </button>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-2">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
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
      )}

      {/* New QR Code Form */}
      {showNewForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Generate New QR Code
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Select Form <span className="text-red-500">*</span>
              </label>
              <select
                value={newFormId}
                onChange={(e) => setNewFormId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Choose a form...</option>
                {forms
                  .filter((f) => f.isActive)
                  .map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Label (optional)
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Reception Desk, Waiting Room"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating || !newFormId}
              className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewLabel("");
                setNewFormId("");
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter by Form */}
      {qrCodes.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Filter by Form
          </label>
          <select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Forms</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* QR Code List */}
      {filteredQRCodes.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="divide-y divide-gray-200">
            {filteredQRCodes.map((qr) => (
              <div
                key={qr.id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {/* QR Icon */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                    <svg
                      className="h-6 w-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                      />
                    </svg>
                  </div>

                  {/* QR Info */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {qr.label || `QR Code ${qr.shortCode}`}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          qr.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {qr.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {qr.formTemplate.title}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="font-mono">{qr.shortCode}</span>
                      <span>|</span>
                      <span>{qr.scanCount} scans</span>
                      {qr.lastScannedAt && (
                        <>
                          <span>|</span>
                          <span>Last: {formatDate(qr.lastScannedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewQR(qr)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleToggleActive(qr)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      qr.isActive
                        ? "border border-red-300 text-red-700 hover:bg-red-50"
                        : "border border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {qr.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No QR codes yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Generate a QR code to let patients access your forms by scanning
          </p>
          <button
            onClick={() => setShowNewForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Generate Your First QR Code
          </button>
        </div>
      )}

      {/* QR Code Display Modal */}
      {selectedQR && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) setSelectedQR(null);
          }}
        >
          <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
              {/* Modal Header - Sticky on mobile */}
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white p-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedQR.label || `QR Code ${selectedQR.shortCode}`}
                </h3>
                <button
                  onClick={() => setSelectedQR(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6">
                {/* QR Code Image - Smaller on mobile */}
                <div className="flex justify-center rounded-lg bg-white p-2 sm:p-4">
                  {selectedQR.qrImageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedQR.qrImageDataUrl}
                      alt="QR Code"
                      className="h-48 w-48 sm:h-64 sm:w-64"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center sm:h-64 sm:w-64">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                    </div>
                  )}
                </div>

                {/* Form Info */}
                <div className="mt-3 rounded-lg bg-gray-50 p-3 sm:mt-4 sm:p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedQR.formTemplate.title}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">
                    {selectedQR.formUrl}
                  </p>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4">
                  <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                    <p className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {selectedQR.scanCount}
                    </p>
                    <p className="text-xs text-gray-500 sm:text-sm">Total Scans</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2 text-center sm:p-3">
                    <p className="text-xs font-medium text-gray-900 sm:text-sm">
                      {selectedQR.lastScannedAt
                        ? formatDate(selectedQR.lastScannedAt)
                        : "Never"}
                    </p>
                    <p className="text-xs text-gray-500 sm:text-sm">Last Scanned</p>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-3 flex items-center justify-center gap-2 sm:mt-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                      selectedQR.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedQR.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    {selectedQR.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Modal Footer - Sticky on mobile */}
              <div className="sticky bottom-0 rounded-b-xl border-t border-gray-200 bg-white p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-4 sm:text-sm"
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Copy URL</span>
                    <span className="sm:hidden">Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadPNG}
                    disabled={!selectedQR.qrImageDataUrl}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    PNG
                  </button>
                  <button
                    onClick={handleDownloadSVG}
                    disabled={!selectedQR.qrImageSvg}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-sm"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    SVG
                  </button>
                  <button
                    onClick={handlePrintPreview}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700 sm:gap-2 sm:px-4 sm:text-sm"
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Display Modal */}
      {showPrintModal && selectedQR && selectedQR.qrImageDataUrl && (
        <QRPrintDisplay
          qrImageDataUrl={selectedQR.qrImageDataUrl}
          qrImageSvg={selectedQR.qrImageSvg}
          shortCode={selectedQR.shortCode}
          formUrl={selectedQR.formUrl}
          formTitle={selectedQR.formTemplate.title}
          organizationName={selectedQR.organization?.name || "Practice"}
          organizationLogo={selectedQR.organization?.logo}
          label={selectedQR.label}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
}
