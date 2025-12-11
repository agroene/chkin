"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function ProviderDashboard() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    return (
      <main className="min-h-screen p-8">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Provider Portal</h1>
          {session?.user && (
            <p className="text-gray-600">
              Welcome, {session.user.name || session.user.email}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Submissions</h2>
          <p className="text-gray-600 text-sm">
            View patient form submissions
          </p>
          <p className="mt-4 text-2xl font-bold text-blue-600">0</p>
          <p className="text-xs text-gray-500">pending review</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">QR Codes</h2>
          <p className="text-gray-600 text-sm">
            Generate QR codes for patient onboarding
          </p>
          <p className="mt-4 text-sm text-gray-500">Coming soon</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Settings</h2>
          <p className="text-gray-600 text-sm">
            Manage practice settings and team
          </p>
          <p className="mt-4 text-sm text-gray-500">Coming soon</p>
        </div>
      </div>
    </main>
  );
}
