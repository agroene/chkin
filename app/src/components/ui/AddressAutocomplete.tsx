"use client";

/**
 * Address Autocomplete Component
 *
 * Uses Google Places API (New) with AutocompleteSuggestion for cost efficiency.
 * Biased to South African addresses.
 *
 * Note: As of March 1st, 2025, the legacy AutocompleteService is not available
 * to new customers. This component uses the new AutocompleteSuggestion API.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface AddressComponents {
  // Building/Complex details
  complexName: string;      // premise - estate, complex, building name
  unitNumber: string;       // subpremise - apartment, unit, suite number
  floor: string;            // floor number

  // Street address
  streetNumber: string;     // street_number
  streetName: string;       // route
  streetAddress: string;    // combined street number + route

  // Area/Region
  neighborhood: string;     // neighborhood
  suburb: string;           // sublocality
  city: string;             // locality
  province: string;         // administrative_area_level_1
  postalCode: string;       // postal_code
  country: string;          // country

  // Full address and coordinates
  formattedAddress: string;
  lat?: number;
  lng?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressComponents) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

// Track if script is loading/loaded globally
let isScriptLoading = false;
let isScriptLoaded = false;
const scriptLoadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    // Currently loading - queue callback
    if (isScriptLoading) {
      scriptLoadCallbacks.push(() => resolve());
      return;
    }

    // Start loading
    isScriptLoading = true;

    // Create script element - using the new API requires importing the places library
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
      scriptLoadCallbacks.forEach((cb) => cb());
      scriptLoadCallbacks.length = 0;
    };

    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error("Failed to load Google Maps script"));
    };

    document.head.appendChild(script);
  });
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  placePrediction: google.maps.places.PlacePrediction;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  required = false,
  className = "",
  id,
  name,
}: AddressAutocompleteProps) {
  // Check API key availability once on mount (before effects run)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const hasApiKey = Boolean(apiKey);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    hasApiKey ? null : "Google Places API key not configured"
  );
  const [isApiReady, setIsApiReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    if (!apiKey) {
      return;
    }

    let isMounted = true;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (isMounted && window.google?.maps?.places) {
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
          setIsApiReady(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load Google Places:", err);
        if (isMounted) {
          setError("Failed to load address autocomplete");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Fetch suggestions with the new AutocompleteSuggestion API
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!window.google?.maps?.places || !sessionToken.current || input.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      try {
        const { AutocompleteSuggestion } = window.google.maps.places;

        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionToken.current,
          includedRegionCodes: ["za"], // Restrict to South Africa
          // Note: Don't use includedPrimaryTypes for addresses - Table B types
          // (street_address, premise, etc.) are response-only and can't be used as filters
        });

        const formattedSuggestions: Suggestion[] = results
          .filter((s): s is google.maps.places.AutocompleteSuggestion & { placePrediction: google.maps.places.PlacePrediction } =>
            s.placePrediction !== null
          )
          .map((s) => ({
            placeId: s.placePrediction.placeId,
            mainText: s.placePrediction.mainText?.text || "",
            secondaryText: s.placePrediction.secondaryText?.text || "",
            placePrediction: s.placePrediction,
          }));

        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      } catch (err) {
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce API calls
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelect = async (suggestion: Suggestion) => {
    if (!sessionToken.current) return;

    setShowSuggestions(false);
    setIsLoading(true);

    try {
      // Convert prediction to Place and fetch details
      const place = suggestion.placePrediction.toPlace();

      await place.fetchFields({
        fields: ["addressComponents", "formattedAddress", "location", "displayName"],
      });

      // Debug: Log what Google returns
      console.log("Google Place Details:", {
        displayName: place.displayName,
        formattedAddress: place.formattedAddress,
        addressComponents: place.addressComponents?.map(c => ({
          types: c.types,
          longText: c.longText,
          shortText: c.shortText,
        })),
      });

      // Create new session token after selection (billing optimization)
      sessionToken.current = new window.google!.maps.places.AutocompleteSessionToken();

      const addressComponents = parseAddressComponents(place, suggestion.mainText);
      onChange(addressComponents.streetAddress || suggestion.mainText);
      onSelect(addressComponents);
    } catch (err) {
      console.error("Failed to fetch place details:", err);
      // Fallback - just use the suggestion text
      onChange(suggestion.mainText);
      onSelect({
        complexName: "",
        unitNumber: "",
        floor: "",
        streetNumber: "",
        streetName: "",
        streetAddress: suggestion.mainText,
        neighborhood: "",
        suburb: "",
        city: "",
        province: "",
        postalCode: "",
        country: "South Africa",
        formattedAddress: `${suggestion.mainText}, ${suggestion.secondaryText}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Parse Place details into our address format
  const parseAddressComponents = (place: google.maps.places.Place, suggestionMainText?: string): AddressComponents => {
    const components: AddressComponents = {
      // Building/Complex details
      complexName: "",
      unitNumber: "",
      floor: "",
      // Street address
      streetNumber: "",
      streetName: "",
      streetAddress: "",
      // Area/Region
      neighborhood: "",
      suburb: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      // Full address
      formattedAddress: place.formattedAddress || "",
      lat: place.location?.lat(),
      lng: place.location?.lng(),
    };

    if (!place.addressComponents) return components;

    for (const component of place.addressComponents) {
      const types = component.types;
      const value = component.longText || "";

      // Building/Complex details
      if (types.includes("premise")) {
        components.complexName = value;
      } else if (types.includes("subpremise")) {
        components.unitNumber = value;
      } else if (types.includes("floor")) {
        components.floor = value;
      }
      // Street address
      else if (types.includes("street_number")) {
        components.streetNumber = value;
      } else if (types.includes("route")) {
        components.streetName = value;
      }
      // Area/Region - check sublocality levels for suburb
      else if (types.includes("sublocality") || types.includes("sublocality_level_1") || types.includes("sublocality_level_2")) {
        // Use first sublocality found as suburb
        if (!components.suburb) {
          components.suburb = value;
        }
      } else if (types.includes("neighborhood")) {
        components.neighborhood = value;
      } else if (types.includes("locality")) {
        components.city = value;
      } else if (types.includes("administrative_area_level_1")) {
        components.province = value;
      } else if (types.includes("postal_code")) {
        components.postalCode = value;
      } else if (types.includes("country")) {
        components.country = value;
      }
    }

    // Combine street number and route for streetAddress
    components.streetAddress = [components.streetNumber, components.streetName].filter(Boolean).join(" ");

    // If no suburb found, use neighborhood as fallback
    if (!components.suburb && components.neighborhood) {
      components.suburb = components.neighborhood;
    }

    // If no complexName found from premise, try using displayName or suggestionMainText
    // This handles cases where the place is an estate/complex but Google returns it as the place name
    if (!components.complexName) {
      const displayName = place.displayName;
      // Only use displayName/suggestionMainText if it's different from the street address
      // and doesn't look like a street address (contains letters not just numbers)
      if (displayName && displayName !== components.streetAddress && !/^\d+\s/.test(displayName)) {
        components.complexName = displayName;
      } else if (suggestionMainText && suggestionMainText !== components.streetAddress && !/^\d+\s/.test(suggestionMainText)) {
        components.complexName = suggestionMainText;
      }
    }

    return components;
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const baseInputClasses =
    "block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500";

  if (error) {
    // Fallback to regular input if API fails to load
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`${baseInputClasses} ${className}`}
        />
        <p className="mt-1 text-xs text-amber-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={isApiReady ? placeholder : "Loading..."}
        disabled={disabled || !isApiReady}
        required={required}
        autoComplete="off"
        className={`${baseInputClasses} ${className}`}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="pointer-events-none absolute right-3 top-2.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.placeId}
              onClick={() => handleSelect(suggestion)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
            >
              <div className="font-medium text-gray-900">
                {suggestion.mainText}
              </div>
              <div className="text-xs text-gray-500">
                {suggestion.secondaryText}
              </div>
            </li>
          ))}
          <li className="border-t border-gray-100 px-3 py-1.5">
            <div className="flex items-center justify-end gap-1 text-xs text-gray-400">
              <span>Powered by</span>
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Google"
                className="h-3"
              />
            </div>
          </li>
        </ul>
      )}
    </div>
  );
}
