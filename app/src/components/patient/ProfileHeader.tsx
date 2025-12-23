/**
 * Profile Header Component
 *
 * Displays user avatar (initials), name, and email at the top of the vault.
 * Mobile-first design with settings link.
 */

import Link from "next/link";

interface ProfileHeaderProps {
  name: string;
  email: string;
  image?: string | null;
}

export default function ProfileHeader({ name, email, image }: ProfileHeaderProps) {
  // Generate initials from name
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xl font-bold text-white shadow-md ring-2 ring-white">
              {initials}
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
        </div>

        {/* Name and email */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      {/* Settings link */}
      <Link
        href="/patient/settings"
        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Settings"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </Link>
    </div>
  );
}
