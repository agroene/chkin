/**
 * Profile Header Component
 *
 * Displays user avatar (initials or photo), name, and email at the top of the vault.
 * Clicking the avatar opens file picker to upload a new photo.
 * Mobile-first design with settings link.
 */

"use client";

import { useRef, useState } from "react";

interface ProfileHeaderProps {
  name: string;
  email: string;
  image?: string | null;
  onAvatarChange?: (newImageUrl: string) => void;
}

export default function ProfileHeader({
  name,
  email,
  image,
  onAvatarChange,
}: ProfileHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Generate initials from name
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Handle avatar click - open file picker
  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = "";

    // Client-side validation
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please select a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError("Image must be less than 5MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/patient/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();

      // Notify parent of the change
      if (onAvatarChange && data.image) {
        onAvatarChange(data.image);
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
        {/* Avatar - clickable to upload */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={isUploading}
          className="relative group focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded-full"
          aria-label="Change profile photo"
        >
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-md transition-opacity group-hover:opacity-80"
            />
          ) : (
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xl font-bold text-white shadow-md ring-2 ring-white transition-opacity group-hover:opacity-80">
              {initials}
              {/* Plus icon indicator for empty avatar - hides on hover */}
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 transition-opacity group-hover:opacity-0">
                <svg
                  className="h-3 w-3 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Camera overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>

          {/* Loading spinner */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}

          {/* Online indicator - only show when image exists (plus icon shows otherwise) */}
          {image && (
            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        {/* Name and email */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">{email}</p>
          {uploadError && (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          )}
        </div>
    </div>
  );
}
