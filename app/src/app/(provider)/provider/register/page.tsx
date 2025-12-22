"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { signUp, sendVerificationEmail } from "@/lib/auth-client";
import { AddressAutocomplete, type AddressComponents, PhoneInput } from "@/components/ui";

type RegistrationState = "form" | "check-email" | "submitted";

const INDUSTRY_TYPES = [
  { value: "general_practice", label: "General Practice" },
  { value: "specialist", label: "Specialist" },
  { value: "dental", label: "Dental" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "psychology", label: "Psychology" },
  { value: "optometry", label: "Optometry" },
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "other", label: "Other" },
];

export default function ProviderRegisterPage() {
  const [state, setState] = useState<RegistrationState>("form");
  const [formData, setFormData] = useState({
    practiceName: "",
    practiceNumber: "",
    email: "",
    phone: "",
    industryType: "",
    // Address fields
    complexName: "",    // Building/complex/estate name
    unitNumber: "",     // Unit/apartment number
    address: "",        // Street address
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    website: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function handleResendVerification() {
    setResendLoading(true);
    setResendSuccess(false);

    try {
      await sendVerificationEmail({
        email: formData.email,
        callbackURL: "/provider/pending",
      });
      setResendSuccess(true);
    } catch {
      // Silently fail - don't reveal if email exists
    } finally {
      setResendLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  // Handle address selection from Google Places autocomplete
  function handleAddressSelect(addressComponents: AddressComponents) {
    setFormData((prev) => ({
      ...prev,
      complexName: addressComponents.complexName || prev.complexName,
      unitNumber: addressComponents.unitNumber || prev.unitNumber,
      address: addressComponents.streetAddress || prev.address,
      suburb: addressComponents.suburb || prev.suburb,
      city: addressComponents.city || prev.city,
      province: addressComponents.province || prev.province,
      postalCode: addressComponents.postalCode || prev.postalCode,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create the user account with callbackURL to redirect to pending page after verification
      const signUpResult = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.practiceName,
        callbackURL: "/provider/pending",
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Step 2: Save pending registration data to database (exclude password fields)
      // Note: We include email so the API can look up the just-created user (no session yet)
      try {
        const { password, confirmPassword, ...registrationData } = formData;
        const saveResponse = await fetch("/api/provider/save-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registrationData),
        });

        if (!saveResponse.ok) {
          console.error("Failed to save registration data:", await saveResponse.text());
          // Continue anyway - data can be re-entered on pending page if needed
        }
      } catch (err) {
        console.error("Error saving registration data:", err);
        // Continue - not critical
      }

      // Show check email screen
      setState("check-email");
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  // Check email screen
  if (state === "check-email") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <Logo size="md" linkToHome className="mx-auto" />
          <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-gray-600 mb-4">
                We&apos;ve sent a verification link to:
              </p>
              <p className="font-medium text-gray-900 mb-4">{formData.email}</p>
              <p className="text-sm text-gray-500">
                Click the link in the email to verify your account. Once
                verified, your practice registration will be reviewed by our
                team.
              </p>
            </div>
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Your practice registration requires
                approval. You&apos;ll receive an email once your practice has
                been approved.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-gray-500">
                Didn&apos;t receive the email? Check your spam folder.
              </p>
              {resendSuccess ? (
                <p className="text-sm text-green-600">
                  Verification email sent! Check your inbox.
                </p>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="text-sm text-teal-600 hover:text-teal-500 disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend verification email"}
                </button>
              )}
            </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="md" linkToHome className="mx-auto" />
          <h2 className="mt-6 text-xl text-gray-600">
            Register your practice
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Join the Chkin platform to streamline patient data collection
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Practice Information */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Practice Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="practiceName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Practice name *
                  </label>
                  <input
                    id="practiceName"
                    name="practiceName"
                    type="text"
                    required
                    value={formData.practiceName}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="City Medical Practice"
                  />
                </div>

                <div>
                  <label
                    htmlFor="practiceNumber"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Practice number
                  </label>
                  <input
                    id="practiceNumber"
                    name="practiceNumber"
                    type="text"
                    value={formData.practiceNumber}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label
                    htmlFor="industryType"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Industry type *
                  </label>
                  <select
                    id="industryType"
                    name="industryType"
                    required
                    value={formData.industryType}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                  >
                    <option value="">Select industry type</option>
                    {INDUSTRY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Contact Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="practice@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Phone number *
                  </label>
                  <div className="mt-1">
                    <PhoneInput
                      value={formData.phone}
                      onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
                      defaultCountry="ZA"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Address</h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Street address *
                  </label>
                  <AddressAutocomplete
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
                    onSelect={handleAddressSelect}
                    placeholder="Start typing an address..."
                    required
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="complexName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Building / Complex / Estate
                    </label>
                    <input
                      id="complexName"
                      name="complexName"
                      type="text"
                      value={formData.complexName}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Medical Centre"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="unitNumber"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Unit / Suite / Floor
                    </label>
                    <input
                      id="unitNumber"
                      name="unitNumber"
                      type="text"
                      value={formData.unitNumber}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Suite 101"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="suburb"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Suburb
                    </label>
                    <input
                      id="suburb"
                      name="suburb"
                      type="text"
                      value={formData.suburb}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Gardens"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-gray-700"
                    >
                      City *
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Cape Town"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="province"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Province *
                    </label>
                    <input
                      id="province"
                      name="province"
                      type="text"
                      required
                      value={formData.province}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="Western Cape"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="postalCode"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Postal code *
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                      placeholder="8001"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Set your password
              </h3>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="••••••••••••"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum 12 characters
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already registered? </span>
            <Link href="/login" className="text-teal-600 hover:text-teal-500">
              Sign in
            </Link>
          </div>

          <div className="text-center text-sm border-t border-gray-200 pt-4">
            <span className="text-gray-600">Not a healthcare provider? </span>
            <Link href="/register" className="text-teal-600 hover:text-teal-500">
              Register as a user
            </Link>
          </div>
        </form>

        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
