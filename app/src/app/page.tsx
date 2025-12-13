import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/logo.png"
            alt="Chkin - Share your info. Own your consent."
            width={350}
            height={120}
            className="mx-auto"
            priority
          />
        </div>

        {/* Tagline */}
        <p className="text-lg text-gray-600 mb-12 leading-relaxed">
          A secure, consent-driven platform that empowers you to store, manage,
          and selectively share personal information with trusted providers
          through a simple QR-based process.
        </p>

        {/* Main CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm leading-none"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 bg-white text-teal-600 font-medium rounded-lg border-2 border-teal-600 hover:bg-teal-50 transition-colors leading-none"
          >
            Login
          </Link>
        </div>

        {/* Provider section */}
        <div className="pt-8 border-t border-gray-200">
          <p className="text-gray-500 mb-3">Healthcare Provider?</p>
          <Link
            href="/provider/register"
            className="text-teal-600 hover:text-teal-700 font-medium hover:underline"
          >
            Register your practice
          </Link>
        </div>
      </div>
    </main>
  );
}
