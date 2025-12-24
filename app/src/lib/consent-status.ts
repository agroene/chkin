/**
 * Consent Status Helper
 *
 * Calculates the current consent status based on dates and withdrawal state.
 * States: ACTIVE, EXPIRING, GRACE, EXPIRED, WITHDRAWN
 *
 * Timeline:
 * [Consent Given] -----> [30 days before expiry = EXPIRING] -----> [Expiry = GRACE] -----> [Grace + 30 days = EXPIRED]
 *
 * WITHDRAWN can happen at any time and takes precedence over time-based states.
 */

export type ConsentStatus = "ACTIVE" | "EXPIRING" | "GRACE" | "EXPIRED" | "WITHDRAWN" | "NEVER_GIVEN";

export interface ConsentStatusResult {
  status: ConsentStatus;
  isAccessible: boolean; // Can organization access data?
  message: string;
  daysRemaining: number | null; // Days until expiry (negative = days overdue)
  expiresAt: Date | null;
  gracePeriodEndsAt: Date | null;
  canRenew: boolean;
  renewalUrgency: "none" | "low" | "medium" | "high" | "critical";
}

interface ConsentDates {
  consentGiven: boolean;
  consentAt: Date | null;
  consentExpiresAt: Date | null;
  consentWithdrawnAt: Date | null;
  gracePeriodDays?: number; // Default 30
}

const DEFAULT_GRACE_PERIOD_DAYS = 30;
const EXPIRING_WARNING_DAYS = 30; // Show warning 30 days before expiry

/**
 * Calculate the consent status based on dates
 */
export function calculateConsentStatus(dates: ConsentDates): ConsentStatusResult {
  const now = new Date();
  const gracePeriodDays = dates.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;

  // Never given consent
  if (!dates.consentGiven || !dates.consentAt) {
    return {
      status: "NEVER_GIVEN",
      isAccessible: false,
      message: "Consent has never been given",
      daysRemaining: null,
      expiresAt: null,
      gracePeriodEndsAt: null,
      canRenew: false,
      renewalUrgency: "none",
    };
  }

  // Withdrawn consent takes precedence
  if (dates.consentWithdrawnAt) {
    return {
      status: "WITHDRAWN",
      isAccessible: false,
      message: "Consent has been withdrawn",
      daysRemaining: null,
      expiresAt: dates.consentExpiresAt,
      gracePeriodEndsAt: null,
      canRenew: false,
      renewalUrgency: "none",
    };
  }

  // No expiry date means perpetual consent (legacy data)
  if (!dates.consentExpiresAt) {
    return {
      status: "ACTIVE",
      isAccessible: true,
      message: "Consent is active (no expiry set)",
      daysRemaining: null,
      expiresAt: null,
      gracePeriodEndsAt: null,
      canRenew: false,
      renewalUrgency: "none",
    };
  }

  const expiresAt = new Date(dates.consentExpiresAt);
  const gracePeriodEndsAt = new Date(expiresAt);
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + gracePeriodDays);

  // Calculate days remaining until expiry
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay);
  const daysUntilGraceEnds = Math.ceil((gracePeriodEndsAt.getTime() - now.getTime()) / msPerDay);

  // EXPIRED: Past grace period
  if (now > gracePeriodEndsAt) {
    return {
      status: "EXPIRED",
      isAccessible: false,
      message: "Consent has expired and grace period has ended",
      daysRemaining: daysUntilExpiry, // Will be negative
      expiresAt,
      gracePeriodEndsAt,
      canRenew: true,
      renewalUrgency: "critical",
    };
  }

  // GRACE: Past expiry but within grace period
  if (now > expiresAt) {
    return {
      status: "GRACE",
      isAccessible: true, // Still accessible during grace period
      message: `Consent expired, grace period ends in ${daysUntilGraceEnds} days`,
      daysRemaining: daysUntilExpiry, // Will be negative
      expiresAt,
      gracePeriodEndsAt,
      canRenew: true,
      renewalUrgency: "critical",
    };
  }

  // EXPIRING: Within warning period (30 days before expiry)
  if (daysUntilExpiry <= EXPIRING_WARNING_DAYS) {
    const urgency = daysUntilExpiry <= 7 ? "high" : daysUntilExpiry <= 14 ? "medium" : "low";
    return {
      status: "EXPIRING",
      isAccessible: true,
      message: `Consent expires in ${daysUntilExpiry} days`,
      daysRemaining: daysUntilExpiry,
      expiresAt,
      gracePeriodEndsAt,
      canRenew: true,
      renewalUrgency: urgency,
    };
  }

  // ACTIVE: Consent is valid and not expiring soon
  return {
    status: "ACTIVE",
    isAccessible: true,
    message: `Consent is active until ${formatDate(expiresAt)}`,
    daysRemaining: daysUntilExpiry,
    expiresAt,
    gracePeriodEndsAt,
    canRenew: true,
    renewalUrgency: "none",
  };
}

/**
 * Calculate consent expiry date from consent date and duration
 */
export function calculateConsentExpiry(consentAt: Date, durationMonths: number): Date {
  const expiresAt = new Date(consentAt);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
  return expiresAt;
}

/**
 * Calculate new expiry date after renewal (from current expiry, not today)
 */
export function calculateRenewalExpiry(currentExpiresAt: Date, durationMonths: number): Date {
  const newExpiresAt = new Date(currentExpiresAt);
  newExpiresAt.setMonth(newExpiresAt.getMonth() + durationMonths);
  return newExpiresAt;
}

/**
 * Create renewal history entry
 */
export interface RenewalHistoryEntry {
  renewedAt: string; // ISO date
  previousExpiresAt: string; // ISO date
  newExpiresAt: string; // ISO date
  renewedBy: "auto" | "patient" | "provider";
  durationMonths: number;
}

export function createRenewalEntry(
  previousExpiresAt: Date,
  newExpiresAt: Date,
  renewedBy: "auto" | "patient" | "provider",
  durationMonths: number
): RenewalHistoryEntry {
  return {
    renewedAt: new Date().toISOString(),
    previousExpiresAt: previousExpiresAt.toISOString(),
    newExpiresAt: newExpiresAt.toISOString(),
    renewedBy,
    durationMonths,
  };
}

/**
 * Get human-readable status badge info
 */
export function getConsentStatusBadge(status: ConsentStatus): {
  label: string;
  color: "green" | "yellow" | "orange" | "red" | "gray";
  icon: "check" | "clock" | "alert" | "x" | "minus";
} {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", color: "green", icon: "check" };
    case "EXPIRING":
      return { label: "Expiring Soon", color: "yellow", icon: "clock" };
    case "GRACE":
      return { label: "Grace Period", color: "orange", icon: "alert" };
    case "EXPIRED":
      return { label: "Expired", color: "red", icon: "x" };
    case "WITHDRAWN":
      return { label: "Withdrawn", color: "gray", icon: "x" };
    case "NEVER_GIVEN":
      return { label: "No Consent", color: "gray", icon: "minus" };
  }
}

// Helper to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
