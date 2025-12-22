"use client";

/**
 * Provider Settings Page
 *
 * Allows organization owners to view and update their organization details.
 * Includes full address fields with Google Places autocomplete and map view.
 */

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import {
  PhoneInput,
  AddressAutocomplete,
  type AddressComponents,
} from "@/components/ui";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  phone: string | null;
  website: string | null;
  practiceNumber: string | null;
  industryType: string | null;
  // Address fields
  complexName: string | null;
  unitNumber: string | null;
  streetAddress: string | null;
  suburb: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

interface FormData {
  name: string;
  phone: string;
  website: string;
  practiceNumber: string;
  industryType: string;
  // Address fields
  complexName: string;
  unitNumber: string;
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

const INITIAL_FORM_DATA: FormData = {
  name: "",
  phone: "",
  website: "",
  practiceNumber: "",
  industryType: "",
  complexName: "",
  unitNumber: "",
  streetAddress: "",
  suburb: "",
  city: "",
  province: "",
  postalCode: "",
  country: "South Africa",
  lat: null,
  lng: null,
};

export default function ProviderSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isDirty, setIsDirty] = useState(false);

  // For the address autocomplete display value
  const [addressSearchValue, setAddressSearchValue] = useState("");

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
        const org = data.organization;
        setFormData({
          name: org.name || "",
          phone: org.phone || "",
          website: org.website || "",
          practiceNumber: org.practiceNumber || "",
          industryType: org.industryType || "",
          complexName: org.complexName || "",
          unitNumber: org.unitNumber || "",
          streetAddress: org.streetAddress || "",
          suburb: org.suburb || "",
          city: org.city || "",
          province: org.province || "",
          postalCode: org.postalCode || "",
          country: org.country || "South Africa",
          lat: org.lat,
          lng: org.lng,
        });

        // Set address search value for autocomplete display
        setAddressSearchValue(org.streetAddress || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Update form field
  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setSuccess(false);
      setError(null);
    },
    []
  );

  // Handle address selection from autocomplete
  const handleAddressSelect = useCallback((components: AddressComponents) => {
    setFormData((prev) => ({
      ...prev,
      complexName: components.complexName || prev.complexName,
      unitNumber: components.unitNumber || prev.unitNumber,
      streetAddress: components.streetAddress || "",
      suburb: components.suburb || "",
      city: components.city || "",
      province: components.province || "",
      postalCode: components.postalCode || "",
      country: components.country || "South Africa",
      lat: components.lat ?? null,
      lng: components.lng ?? null,
    }));
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
        website: organization.website || "",
        practiceNumber: organization.practiceNumber || "",
        industryType: organization.industryType || "",
        complexName: organization.complexName || "",
        unitNumber: organization.unitNumber || "",
        streetAddress: organization.streetAddress || "",
        suburb: organization.suburb || "",
        city: organization.city || "",
        province: organization.province || "",
        postalCode: organization.postalCode || "",
        country: organization.country || "South Africa",
        lat: organization.lat,
        lng: organization.lng,
      });
      setAddressSearchValue(organization.streetAddress || "");
      setIsDirty(false);
      setError(null);
      setSuccess(false);
    }
  };

  const isOwner = role === "owner";

  // Build Google Maps embed URL
  const getMapUrl = () => {
    if (formData.lat && formData.lng) {
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&q=${formData.lat},${formData.lng}&zoom=16`;
    }
    // Fallback to address search
    const addressParts = [
      formData.streetAddress,
      formData.suburb,
      formData.city,
      formData.province,
      formData.postalCode,
      formData.country,
    ].filter(Boolean);
    if (addressParts.length > 0) {
      return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&q=${encodeURIComponent(addressParts.join(", "))}`;
    }
    return null;
  };

  const mapUrl = getMapUrl();

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
            {/* Address Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Search Address
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Start typing to search for your address - fields will auto-populate
              </p>
              <AddressAutocomplete
                value={addressSearchValue}
                onChange={setAddressSearchValue}
                onSelect={handleAddressSelect}
                placeholder="Start typing your address..."
                disabled={!isOwner || saving}
              />
            </div>

            {/* Building/Complex Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="complexName" className="block text-sm font-medium text-gray-700">
                  Building / Complex Name
                </label>
                <input
                  type="text"
                  id="complexName"
                  value={formData.complexName}
                  onChange={(e) => updateField("complexName", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., Medical Centre"
                />
              </div>
              <div>
                <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700">
                  Unit / Suite Number
                </label>
                <input
                  type="text"
                  id="unitNumber"
                  value={formData.unitNumber}
                  onChange={(e) => updateField("unitNumber", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., Suite 12"
                />
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                id="streetAddress"
                value={formData.streetAddress}
                onChange={(e) => updateField("streetAddress", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="123 Main Street"
              />
            </div>

            {/* Suburb and City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="suburb" className="block text-sm font-medium text-gray-700">
                  Suburb
                </label>
                <input
                  type="text"
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => updateField("suburb", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., Gardens"
                />
              </div>
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
                  placeholder="e.g., Cape Town"
                />
              </div>
            </div>

            {/* Province and Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700">
                  Province
                </label>
                <select
                  id="province"
                  value={formData.province}
                  onChange={(e) => updateField("province", e.target.value)}
                  disabled={!isOwner || saving}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select province...</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="North West">North West</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
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
                  placeholder="e.g., 8001"
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                Country
              </label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => updateField("country", e.target.value)}
                disabled={!isOwner || saving}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="South Africa">South Africa</option>
                <option value="Botswana">Botswana</option>
                <option value="Lesotho">Lesotho</option>
                <option value="Mozambique">Mozambique</option>
                <option value="Namibia">Namibia</option>
                <option value="Eswatini">Eswatini</option>
                <option value="Zimbabwe">Zimbabwe</option>
              </select>
            </div>

            {/* GPS Coordinates (Read-only display) */}
            {(formData.lat || formData.lng) && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700">
                  GPS Coordinates
                </label>
                <p className="mt-1 text-sm text-gray-600 font-mono bg-gray-50 rounded px-3 py-2">
                  {formData.lat?.toFixed(6)}, {formData.lng?.toFixed(6)}
                </p>
              </div>
            )}

            {/* Map Preview */}
            {mapUrl && process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY && (
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Preview
                </label>
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <iframe
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapUrl}
                  />
                </div>
              </div>
            )}
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
