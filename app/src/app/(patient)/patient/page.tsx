"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function PatientDashboard() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Patient Portal</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-400">
        Coming soon: Profile management, consent tracking, QR scanning
      </p>
    </main>
  );
}
