"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { signUp, sendVerificationEmail } from "@/lib/auth-client";

type RegistrationState = "form" | "check-email";

export default function RegisterPage() {
  const [state, setState] = useState<RegistrationState>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Pre-fill form from localStorage (if user came from form submission)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const prefillData = localStorage.getItem("chkin_registration_prefill");
      if (prefillData) {
        try {
          const { name: prefillName, email: prefillEmail } = JSON.parse(prefillData);
          if (prefillName) setName(prefillName);
          if (prefillEmail) setEmail(prefillEmail);
          // Clear the prefill data after using it
          localStorage.removeItem("chkin_registration_prefill");
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, []);

  async function handleResendVerification() {
    setResendLoading(true);
    setResendSuccess(false);

    try {
      await sendVerificationEmail({
        email,
        callbackURL: "/patient",
      });
      setResendSuccess(true);
    } catch {
      // Silently fail - don't reveal if email exists
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/patient", // Redirect to patient portal after email verification
      });

      if (result.error) {
        setError(result.error.message || "Registration failed");
        setLoading(false);
        return;
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
          <div>
            <Logo size="md" linkToHome className="mx-auto" />
          </div>
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
                    d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Check your email
              </h2>
              <p className="text-gray-600 mb-4">
                We&apos;ve sent a verification link to:
              </p>
              <p className="font-medium text-gray-900 mb-4">{email}</p>
              <p className="text-sm text-gray-500">
                Click the link in the email to verify your account and sign in.
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
            Create your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="text-teal-600 hover:text-teal-500">
              Sign in
            </Link>
          </div>

          <div className="text-center text-sm border-t border-gray-200 pt-4">
            <span className="text-gray-600">Are you a healthcare provider? </span>
            <Link
              href="/provider/register"
              className="text-teal-600 hover:text-teal-500"
            >
              Register your practice
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
