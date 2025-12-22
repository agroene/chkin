"use client";

/**
 * Provider Settings Page
 *
 * Allows organization owners to view and update their organization details.
 */

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { PhoneInput } from "@/components/ui";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  website: string | null;
  practiceNumber: string | null;
  industryType: string | null;
  createdAt: string;
}

interface FormData {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  website: string;
  practiceNumber: string;
  industryType: string;
}

export default function ProviderSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    website: "",
    practiceNumber: "",
    industryType: "",
  });

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);

  // Fetch organization settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/provider/settings");
        if (!response.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await response.json();
        setOrganization(data.organization);
        setRole(data.role);

        // Initialize form data
        setFormData({
          name: data.organization.name || "",
          phone: data.organization.phone || "",
          address: data.organization.address || "",
          city: data.organization.city || "",
          postalCode: data.organization.postalCode || "",
          website: data.organization.website || "",
          practiceNumber: data.organization.practiceNumber || "",
          industryType: data.organization.industryType || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Update form field
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setSuccess(false);
    setError(null);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/provider/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      const data = await response.json();
      setOrganization(data.organization);
      setSuccess(true);
      setIsDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset form to original values
  const handleReset = () => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        phone: organization.phone || "",
        address: organization.address || "",
        city: organization.city || "",
        postalCode: organization.postalCode || "",
        website: organization.website || "",
        practiceNumber: organization.practiceNumber || "",
        industryType: organization.industryType || "",
      });
      setIsDirty(false);
      setError(null);
      setSuccess(false);
    }
  };

  const isOwner = role === "owner";

  if (loading) {
    return (
      <>
        <PageHeader title="Settings" description="Manage your organization settings" />
        <div className="mt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-40 bg-gray-200 rounded" />
            <div className="h-40 bg-gray-200 rounded" />
          </div>
        </div>
      </>
    );
  }

  if (error && !organization) {
    return (
      <>
        <PageHeader title="Settings" description="Manage your organization settings" />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your organization settings"
      />

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">Settings saved successfully!</p>
          </div>
        )}

        {!isOwner && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">
              Only organization owners can edit settings. You are viewing in read-only mode.
            </p>
          </div>
        )}

        {/* Organization Details */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
            <p className="text-sm text-gray-500">
              Basic information about your practice
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Organization Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={!isOwner || saving}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter organization name"
              />
            </div>

            {/* Practice Number */}
            <div>
              <label htmlFor="practiceNumber" className="block text-sm font-medium text-gray-700">
                Practice Number
              </label>
              <input
                type="text"
                id="practiceNumber"
                value={formData.practiceNumber}
                onChange={(e) => updateField("practiceNumber", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="e.g., PR123456"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your HPCSA practice number (if applicable)
              </p>
            </div>

            {/* Industry Type */}
            <div>
              <label htmlFor="industryType" className="block text-sm font-medium text-gray-700">
                Industry Type
              </label>
              <select
                id="industryType"
                value={formData.industryType}
                onChange={(e) => updateField("industryType", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select industry type...</option>
                <option value="general_practice">General Practice</option>
                <option value="specialist">Specialist</option>
                <option value="dental">Dental</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="optometry">Optometry</option>
                <option value="physiotherapy">Physiotherapy</option>
                <option value="psychology">Psychology</option>
                <option value="hospital">Hospital</option>
                <option value="clinic">Clinic</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
            <p className="text-sm text-gray-500">
              How patients and staff can reach your practice
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => updateField("phone", value)}
                  defaultCountry="ZA"
                  disabled={!isOwner || saving}
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => updateField("website", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="https://www.example.com"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Address</h2>
            <p className="text-sm text-gray-500">
              Physical location of your practice
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Street Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="123 Main Street"
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Cape Town"
                />
              </div>
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">
                  Postal Code
                </label>
                <input
                  type="text"
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="8001"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Info (Read-only) */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            <p className="text-sm text-gray-500">
              System-managed information (read-only)
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Organization ID
                </label>
                <p className="mt-1 text-sm text-gray-600 font-mono bg-gray-50 rounded px-3 py-2">
                  {organization?.slug}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Account Status
                </label>
                <p className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      organization?.status === "active"
                        ? "bg-green-100 text-green-800"
                        : organization?.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {organization?.status}
                  </span>
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Member Since
              </label>
              <p className="mt-1 text-sm text-gray-600">
                {organization?.createdAt
                  ? new Date(organization.createdAt).toLocaleDateString("en-ZA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isOwner && (
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!isDirty || saving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </form>
    </>
  );
}
