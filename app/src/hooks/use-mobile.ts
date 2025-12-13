/**
 * Mobile Detection Hook
 *
 * Detects if the viewport is mobile-sized using a media query.
 * Uses the `lg` breakpoint (1024px) as the threshold.
 *
 * @module hooks/use-mobile
 */

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 1024; // lg breakpoint

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial value
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Set initial value
    checkMobile();

    // Create media query listener
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern browsers
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isMobile;
}
