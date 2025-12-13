"use client";

/**
 * Mobile Navigation Header
 *
 * Top header bar shown on mobile with hamburger menu toggle.
 * Includes logo and optional action buttons.
 *
 * @module components/layout/mobile-nav
 */

import Logo from "@/components/Logo";

interface MobileNavProps {
  onMenuToggle: () => void;
  title?: string;
}

export function MobileNav({ onMenuToggle, title }: MobileNavProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
      {/* Menu Toggle Button */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        aria-label="Open menu"
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
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Logo or Title */}
      <div className="flex flex-1 items-center">
        {title ? (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        ) : (
          <Logo size="sm" linkToHome />
        )}
      </div>
    </header>
  );
}
