"use client";

/**
 * Sidebar Overlay
 *
 * Dark overlay shown behind the sidebar on mobile.
 * Clicking it closes the sidebar.
 *
 * @module components/layout/sidebar-overlay
 */

interface SidebarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarOverlay({ isOpen, onClose }: SidebarOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 lg:hidden"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}
