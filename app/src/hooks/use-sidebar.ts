/**
 * Sidebar State Hook
 *
 * Manages sidebar open/close state with automatic closing on navigation
 * and escape key press.
 *
 * @module hooks/use-sidebar
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface UseSidebarReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useSidebar(defaultOpen = false): UseSidebarReturn {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Close sidebar on route change (mobile navigation)
  // This is intentional - we want to close the sidebar when the user navigates
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Skip first mount - only respond to actual navigation
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }

    // Only close if pathname actually changed
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setIsOpen(false);
    }
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevent body scroll when sidebar is open on mobile
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

  return { isOpen, open, close, toggle };
}
