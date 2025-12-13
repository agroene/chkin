"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        // Handle email not verified
        if (result.error.message?.toLowerCase().includes("verify") ||
            result.error.message?.toLowerCase().includes("email")) {
          setNeedsVerification(true);
          setError("Please verify your email before signing in.");
        } else {
          setError(result.error.message || "Invalid email or password");
        }
        setLoading(false);
        return;
      }

      // Fetch redirect path based on user role/organization status
      const redirectResponse = await fetch("/api/auth/redirect");
      const { redirect } = await redirectResponse.json();

      router.push(redirect || "/patient");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="md" linkToHome className="mx-auto" />
          <h2 className="mt-6 text-xl text-gray-600">
            Sign in to your account
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
              {needsVerification && (
                <p className="mt-2">
                  <Link
                    href="/resend-verification"
                    className="text-red-800 underline hover:text-red-900"
                  >
                    Resend verification email
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-teal-600 hover:text-teal-500"
            >
              Forgot password?
            </Link>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-center text-sm text-gray-600 mb-3">
              Don&apos;t have an account?
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/register"
                className="text-teal-600 hover:text-teal-500 text-sm"
              >
                Register as User
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/provider/register"
                className="text-teal-600 hover:text-teal-500 text-sm"
              >
                Register Practice
              </Link>
            </div>
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
