"use client";

/**
 * PhoneInput Component
 *
 * A phone number input with country code selection and auto-formatting.
 * Stores values in E.164 format (+27821234567) for international compatibility.
 *
 * Features:
 * - Country dropdown with flag emojis and dial codes
 * - Southern African countries prioritized
 * - Auto-formatting as user types
 * - Validation using libphonenumber-js
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  parsePhoneNumber,
  AsYouType,
  getCountryCallingCode,
  CountryCode,
  isValidPhoneNumber,
} from "libphonenumber-js";

// Country data with flags and dial codes
interface CountryData {
  code: CountryCode;
  name: string;
  flag: string;
  dialCode: string;
}

// Southern African countries (prioritized)
const SOUTHERN_AFRICAN_COUNTRIES: CountryData[] = [
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  { code: "BW", name: "Botswana", flag: "🇧🇼", dialCode: "+267" },
  { code: "LS", name: "Lesotho", flag: "🇱🇸", dialCode: "+266" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", dialCode: "+258" },
  { code: "NA", name: "Namibia", flag: "🇳🇦", dialCode: "+264" },
  { code: "SZ", name: "Eswatini", flag: "🇸🇿", dialCode: "+268" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", dialCode: "+263" },
];

// Other common countries
const OTHER_COUNTRIES: CountryData[] = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
  { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
  { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233" },
];

const ALL_COUNTRIES = [...SOUTHERN_AFRICAN_COUNTRIES, ...OTHER_COUNTRIES];

// Helper to parse E.164 value into display state
function parseE164Value(value: string, defaultCountryCode: string) {
  if (!value) {
    return {
      country: ALL_COUNTRIES.find((c) => c.code === defaultCountryCode) || ALL_COUNTRIES[0],
      nationalNumber: "",
      isValid: null as boolean | null,
    };
  }

  try {
    const parsed = parsePhoneNumber(value);
    if (parsed) {
      const country = ALL_COUNTRIES.find((c) => c.code === parsed.country);
      return {
        country: country || ALL_COUNTRIES.find((c) => c.code === defaultCountryCode) || ALL_COUNTRIES[0],
        nationalNumber: parsed.formatNational(),
        isValid: parsed.isValid(),
      };
    }
  } catch {
    // If parsing fails, return raw value
  }

  return {
    country: ALL_COUNTRIES.find((c) => c.code === defaultCountryCode) || ALL_COUNTRIES[0],
    nationalNumber: value.replace(/^\+\d+/, ""),
    isValid: null as boolean | null,
  };
}

export interface PhoneInputProps {
  value: string; // E.164 format (+27821234567)
  onChange: (value: string) => void;
  defaultCountry?: string; // ISO country code (ZA)
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string; // Additional classes for the container
  /**
   * Size variant for different contexts:
   * - "default": Standard size (px-3 py-2 text-sm rounded-lg) - for provider dashboards
   * - "large": Mobile-friendly size (px-4 py-3 text-base rounded-lg) - for patient forms
   * - "compact": Compact size (px-3 py-2 rounded-md shadow-sm) - for registration forms
   */
  size?: "default" | "large" | "compact";
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "ZA",
  placeholder,
  disabled = false,
  hasError = false,
  size = "default",
}: PhoneInputProps) {
  // Track internal state that diverges from props during user input
  const [internalState, setInternalState] = useState(() => {
    const parsed = parseE164Value(value, defaultCountry);
    return {
      selectedCountry: parsed.country,
      nationalNumber: parsed.nationalNumber,
      isValid: parsed.isValid,
      // Track which external value we last synced from
      lastExternalValue: value,
    };
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive display state - sync from external when value changes
  const { selectedCountry, nationalNumber, isValid } = useMemo(() => {
    // If external value changed (e.g., form reset, pre-fill), re-parse it
    if (value !== internalState.lastExternalValue) {
      const parsed = parseE164Value(value, defaultCountry);
      // Schedule state update for next render
      queueMicrotask(() => {
        setInternalState({
          selectedCountry: parsed.country,
          nationalNumber: parsed.nationalNumber,
          isValid: parsed.isValid,
          lastExternalValue: value,
        });
      });
      return {
        selectedCountry: parsed.country,
        nationalNumber: parsed.nationalNumber,
        isValid: parsed.isValid,
      };
    }
    // Otherwise use internal state (user is typing)
    return {
      selectedCountry: internalState.selectedCountry,
      nationalNumber: internalState.nationalNumber,
      isValid: internalState.isValid,
    };
  }, [value, defaultCountry, internalState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format and validate as user types
  const handleNumberChange = useCallback(
    (inputValue: string) => {
      // Remove any non-digit characters except for leading + (for paste support)
      let digitsOnly = inputValue.replace(/[^\d+]/g, "");
      const countryToUse = selectedCountry;

      // If pasted value starts with +, try to parse it directly
      if (digitsOnly.startsWith("+")) {
        try {
          const parsed = parsePhoneNumber(digitsOnly);
          if (parsed && parsed.country) {
            const country = ALL_COUNTRIES.find((c) => c.code === parsed.country);
            if (country) {
              const e164Value = parsed.format("E.164");
              setInternalState({
                selectedCountry: country,
                nationalNumber: parsed.formatNational(),
                isValid: parsed.isValid(),
                lastExternalValue: e164Value,
              });
              onChange(e164Value);
              return;
            }
          }
        } catch {
          // Continue with normal processing
        }
        // Remove the + for further processing
        digitsOnly = digitsOnly.replace(/^\+/, "");
      }

      // Remove leading zero if present (common in SA numbers)
      if (digitsOnly.startsWith("0")) {
        digitsOnly = digitsOnly.substring(1);
      }

      // Format as the user types using AsYouType
      const formatter = new AsYouType(countryToUse.code);
      const formatted = formatter.input(digitsOnly);

      // Build E.164 format for storage
      const dialCode = getCountryCallingCode(countryToUse.code);
      const e164 = digitsOnly.length > 0 ? `+${dialCode}${digitsOnly}` : "";

      // Validate the number
      const valid = digitsOnly.length > 0 ? isValidPhoneNumber(e164, countryToUse.code) : null;

      setInternalState({
        selectedCountry: countryToUse,
        nationalNumber: formatted,
        isValid: valid,
        lastExternalValue: e164,
      });

      onChange(e164);
    },
    [selectedCountry, onChange]
  );

  // Handle country selection
  const handleCountrySelect = (country: CountryData) => {
    setShowDropdown(false);

    // Re-format the current number with the new country code
    const digitsOnly = nationalNumber.replace(/\D/g, "");
    const dialCode = getCountryCallingCode(country.code);
    const e164 = digitsOnly.length > 0 ? `+${dialCode}${digitsOnly}` : "";

    // Re-format display
    const formatter = new AsYouType(country.code);
    const formattedNumber = digitsOnly ? formatter.input(digitsOnly) : "";

    // Re-validate
    const valid = digitsOnly.length > 0 ? isValidPhoneNumber(e164, country.code) : null;

    setInternalState({
      selectedCountry: country,
      nationalNumber: formattedNumber,
      isValid: valid,
      lastExternalValue: e164,
    });

    if (e164) {
      onChange(e164);
    }

    // Focus the input after selection
    inputRef.current?.focus();
  };

  // Get placeholder for selected country
  const getPlaceholder = () => {
    if (placeholder) return placeholder;

    // Generate example number based on country
    const examples: Record<string, string> = {
      ZA: "82 123 4567",
      BW: "71 234 567",
      LS: "5812 3456",
      MZ: "82 123 4567",
      NA: "81 123 4567",
      SZ: "7612 3456",
      ZW: "71 234 5678",
      GB: "7911 123456",
      US: "(555) 123-4567",
    };

    return examples[selectedCountry.code] || "Enter phone number";
  };

  // Determine border color based on validation state
  const getBorderClass = () => {
    if (hasError) return "border-red-300 bg-red-50";
    if (isValid === true) return "border-green-300";
    if (isValid === false && nationalNumber.length > 5) return "border-yellow-300";
    return "border-gray-300";
  };

  // Size variant classes
  const sizeClasses = {
    default: {
      container: "rounded-lg",
      button: "px-3 py-2 text-sm",
      input: "px-3 py-2 text-sm",
      flag: "text-base",
    },
    large: {
      container: "rounded-lg",
      button: "px-4 py-3 text-base",
      input: "px-4 py-3 text-base",
      flag: "text-lg",
    },
    compact: {
      container: "rounded-md shadow-sm",
      button: "px-3 py-2",
      input: "px-3 py-2",
      flag: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex border ${classes.container} ${getBorderClass()} overflow-hidden focus-within:ring-1 focus-within:ring-teal-500 focus-within:border-teal-500 ${
          disabled ? "bg-gray-100 opacity-60" : ""
        }`}
      >
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          disabled={disabled}
          className={`flex items-center gap-1 ${classes.button} border-r border-gray-200 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 min-w-[100px]`}
        >
          <span className={classes.flag}>{selectedCountry.flag}</span>
          <span className="text-gray-900">{selectedCountry.dialCode}</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Phone Number Input */}
        <input
          ref={inputRef}
          type="tel"
          value={nationalNumber}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={disabled}
          className={`flex-1 ${classes.input} focus:outline-none text-gray-900 placeholder-gray-400`}
        />

        {/* Validation indicator */}
        {isValid !== null && nationalNumber.length > 3 && (
          <div className="flex items-center pr-3">
            {isValid ? (
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Country Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Southern African Countries */}
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
              Southern Africa
            </div>
            {SOUTHERN_AFRICAN_COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-teal-50 text-left ${
                  selectedCountry.code === country.code ? "bg-teal-50" : ""
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1 text-sm">{country.name}</span>
                <span className="text-sm text-gray-500">{country.dialCode}</span>
              </button>
            ))}
          </div>

          {/* Other Countries */}
          <div className="py-1 border-t border-gray-100">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
              Other Countries
            </div>
            {OTHER_COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-teal-50 text-left ${
                  selectedCountry.code === country.code ? "bg-teal-50" : ""
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1 text-sm">{country.name}</span>
                <span className="text-sm text-gray-500">{country.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
