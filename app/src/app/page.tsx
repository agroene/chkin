import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">Chkin</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Healthcare Digital Onboarding
      </p>

      <div className="grid gap-4 w-full max-w-md">
        <Link
          href="/patient"
          className="block p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-teal-500 dark:hover:border-teal-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-1">Patient Portal</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your profile and consents
          </p>
        </Link>

        <Link
          href="/provider"
          className="block p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-1">Provider Portal</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create forms and view submissions
          </p>
        </Link>

        <Link
          href="/admin"
          className="block p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-1">Admin Console</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Platform administration
          </p>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">Healthcare staff?</p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
