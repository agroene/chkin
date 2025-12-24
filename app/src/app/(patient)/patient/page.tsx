/**
 * Patient Dashboard - Data Vault
 *
 * Mobile-first wallet-style interface for managing patient profile data.
 * Categories displayed as cards that expand to show/edit fields.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import Logo from "@/components/Logo";
import ProfileHeader from "@/components/patient/ProfileHeader";
import ProfileProgress from "@/components/patient/ProfileProgress";
import VaultCardStack from "@/components/patient/VaultCardStack";
import VaultSheet from "@/components/patient/VaultSheet";

interface Field {
  id: string;
  name: string;
  label: string;
  description?: string;
  fieldType: string;
  config?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  sortOrder: number;
  specialPersonalInfo?: boolean;
  requiresExplicitConsent?: boolean;
}

interface Category {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  icon: string;
  sortOrder: number;
  color?: string | null;
  isProtected: boolean;
  previewFields: string[];
  fields: Field[];
}

interface CategoryCompletion {
  name: string;
  label: string;
  totalFields: number;
  filledFields: number;
  percentage: number;
  isComplete: boolean;
}

interface VaultStats {
  overall: {
    totalFields: number;
    filledFields: number;
    percentage: number;
  };
  categories: CategoryCompletion[];
  nextAction: {
    category: string;
    message: string;
  } | null;
  lastUpdated: string | null;
}

export default function PatientDashboard() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avatar state - local override for session image after upload
  const [avatarImage, setAvatarImage] = useState<string | null>(null);

  // Sheet state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false); // Show only incomplete fields

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  // Link any anonymous submissions on first load
  const linkAnonymousSubmissions = async () => {
    if (typeof window === "undefined") return false;

    const anonymousToken = localStorage.getItem("chkin_anonymous_token");
    if (!anonymousToken) return false;

    try {
      const response = await fetch("/api/patient/link-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousToken }),
      });

      // Clear token regardless of result (one-time use)
      localStorage.removeItem("chkin_anonymous_token");
      // Also clear registration prefill data
      localStorage.removeItem("chkin_registration_prefill");

      if (response.ok) {
        const result = await response.json();
        console.log("Linked anonymous submissions:", result);
        return true; // Data was synced, will be reflected in profile fetch
      }
    } catch (err) {
      console.error("Failed to link anonymous submission:", err);
      // Clear token anyway to prevent repeated attempts
      localStorage.removeItem("chkin_anonymous_token");
    }
    return false;
  };

  // Fetch all data on mount
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }

    if (session?.user) {
      // First link any anonymous submissions, then fetch data
      linkAnonymousSubmissions().then(() => {
        fetchData();
      });
    }
  }, [session, isPending, router]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch categories, stats, and profile in parallel
      const [categoriesRes, statsRes, profileRes] = await Promise.all([
        fetch("/api/patient/categories"),
        fetch("/api/patient/vault/stats"),
        fetch("/api/patient/profile"),
      ]);

      if (!categoriesRes.ok || !statsRes.ok || !profileRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [categoriesData, statsData, profileData] = await Promise.all([
        categoriesRes.json(),
        statsRes.json(),
        profileRes.json(),
      ]);

      setCategories(categoriesData.categories || []);
      setStats(statsData);
      setProfileData(profileData.data || {});
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load your vault. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle card click - open sheet with all fields
  const handleCardClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    setIncompleteOnly(false);
    setSheetOpen(true);
  }, []);

  // Handle progress click - open sheet with only incomplete fields
  const handleProgressClick = useCallback((category: Category) => {
    setSelectedCategory(category);
    setIncompleteOnly(true);
    setSheetOpen(true);
  }, []);

  // Handle action click from ProfileProgress - find the next action category
  const handleActionClick = useCallback(() => {
    if (!stats?.nextAction?.category) return;

    // Find the category referenced in the next action
    const targetCategory = categories.find(c => c.name === stats.nextAction?.category);
    if (targetCategory) {
      setSelectedCategory(targetCategory);
      setIncompleteOnly(true);
      setSheetOpen(true);
    }
  }, [categories, stats?.nextAction?.category]);

  // Handle sheet close
  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    // Delay clearing category and mode to allow animation to complete
    setTimeout(() => {
      setSelectedCategory(null);
      setIncompleteOnly(false);
    }, 300);
  }, []);

  // Handle save from sheet
  const handleSave = useCallback(async (updates: Record<string, unknown>) => {
    const response = await fetch("/api/patient/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      throw new Error("Failed to save");
    }

    const result = await response.json();

    // Update local state
    setProfileData(result.data);

    // Refresh stats
    const statsRes = await fetch("/api/patient/vault/stats");
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      setStats(statsData);
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  // Loading state
  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="text-gray-500">Loading your vault...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
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
          <h2 className="text-lg font-semibold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo size="sm" linkToHome />
            {/* Menu dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Menu"
                aria-expanded={menuOpen}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                  />
                </svg>
              </button>
              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/patient/settings");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Settings
                  </button>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                      />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-lg px-4 pb-8">
        {/* Profile header with QR scan button */}
        {session?.user && (
          <div className="py-4">
            <div className="flex items-start justify-between">
              <ProfileHeader
                name={session.user.name || "User"}
                email={session.user.email || ""}
                image={avatarImage || session.user.image}
                onAvatarChange={setAvatarImage}
              />
              {/* QR Scan button - prominent position */}
              <button
                onClick={() => router.push("/patient/scan")}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition-all hover:bg-teal-700 hover:shadow-xl active:scale-95"
                aria-label="Scan QR Code"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2M17 21h2a2 2 0 002-2v-2"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7z"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress ring */}
        {stats && (
          <div className="py-6">
            <ProfileProgress
              percentage={stats.overall.percentage}
              nextAction={stats.nextAction?.message}
              onActionClick={handleActionClick}
            />
          </div>
        )}

        {/* Quick actions - moved above vault */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => router.push("/patient/submissions")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            My Check-ins
          </button>
          <button
            onClick={() => router.push("/patient/consents")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            My Consents
          </button>
        </div>

        {/* Vault cards */}
        <div className="py-4">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            My Data Vault
          </h2>
          <VaultCardStack
            categories={categories}
            completions={stats?.categories || []}
            profileData={profileData}
            onCardClick={handleCardClick}
            onProgressClick={handleProgressClick}
          />
        </div>
      </div>

      {/* Vault sheet */}
      <VaultSheet
        category={selectedCategory}
        isOpen={sheetOpen}
        onClose={handleSheetClose}
        profileData={profileData}
        onSave={handleSave}
        incompleteOnly={incompleteOnly}
      />
    </div>
  );
}
