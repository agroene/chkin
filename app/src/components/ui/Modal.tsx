"use client";

/**
 * Modal Component
 *
 * Accessible modal dialog with backdrop.
 * Mobile-first: full-screen on mobile, centered dialog on desktop.
 *
 * @module components/ui/modal
 */

import { ReactNode, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog positioning */}
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        {/* Dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`
            relative w-full transform overflow-hidden bg-white shadow-xl transition-all
            rounded-t-2xl sm:rounded-lg
            ${sizeStyles[size]}
          `}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between">
              <div>
                <h3
                  id="modal-title"
                  className="text-base font-semibold text-gray-900 sm:text-lg"
                >
                  {title}
                </h3>
                {description && (
                  <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 -mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                aria-label="Close"
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

          {/* Body */}
          <div className="px-4 py-4 sm:px-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                {footer}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
