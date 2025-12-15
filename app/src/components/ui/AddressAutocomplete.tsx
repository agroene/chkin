"use client";

/**
 * Address Autocomplete Component
 *
 * Uses Google Places Autocomplete API with session tokens for cost efficiency.
 * Biased to South African addresses.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// Extend Window interface for Google Maps callback
declare global {
  interface Window {
    initGooglePlaces?: () => void;
  }
}

export interface AddressComponents {
  streetAddress: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
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

    // Set up callback
    window.initGooglePlaces = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      resolve();
      scriptLoadCallbacks.forEach((cb) => cb());
      scriptLoadCallbacks.length = 0;
    };

    // Create script element
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error("Failed to load Google Maps script"));
    };

    document.head.appendChild(script);
  });
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

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    hasApiKey ? null : "Google Places API key not configured"
  );
  const [isApiReady, setIsApiReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
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
          autocompleteService.current = new window.google.maps.places.AutocompleteService();
          // Create a dummy element for PlacesService
          const dummyElement = document.createElement("div");
          placesService.current = new window.google.maps.places.PlacesService(dummyElement);
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

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!autocompleteService.current || !sessionToken.current || input.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      autocompleteService.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionToken.current,
          componentRestrictions: { country: "za" }, // Restrict to South Africa
          types: ["address"], // Only return addresses
        },
        (predictions, status) => {
          setIsLoading(false);

          if (status === window.google?.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else if (status === window.google?.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
          } else {
            console.error("Autocomplete error:", status);
            setSuggestions([]);
          }
        }
      );
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
  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current || !sessionToken.current) return;

    setShowSuggestions(false);
    setIsLoading(true);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        sessionToken: sessionToken.current,
        fields: ["address_components", "formatted_address", "geometry"],
      },
      (place, status) => {
        setIsLoading(false);

        // Create new session token after selection (billing optimization)
        sessionToken.current = new window.google!.maps.places.AutocompleteSessionToken();

        if (status === window.google?.maps.places.PlacesServiceStatus.OK && place) {
          const addressComponents = parseAddressComponents(place);
          onChange(addressComponents.streetAddress || prediction.structured_formatting.main_text);
          onSelect(addressComponents);
        } else {
          // Fallback - just use the prediction text
          onChange(prediction.structured_formatting.main_text);
          onSelect({
            streetAddress: prediction.structured_formatting.main_text,
            suburb: "",
            city: "",
            province: "",
            postalCode: "",
            country: "South Africa",
            formattedAddress: prediction.description,
          });
        }
      }
    );
  };

  // Parse Google Place details into our address format
  const parseAddressComponents = (place: google.maps.places.PlaceResult): AddressComponents => {
    const components: AddressComponents = {
      streetAddress: "",
      suburb: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
      formattedAddress: place.formatted_address || "",
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
    };

    if (!place.address_components) return components;

    let streetNumber = "";
    let route = "";

    for (const component of place.address_components) {
      const types = component.types;

      if (types.includes("street_number")) {
        streetNumber = component.long_name;
      } else if (types.includes("route")) {
        route = component.long_name;
      } else if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        components.suburb = component.long_name;
      } else if (types.includes("locality")) {
        components.city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        components.province = component.long_name;
      } else if (types.includes("postal_code")) {
        components.postalCode = component.long_name;
      } else if (types.includes("country")) {
        components.country = component.long_name;
      }
    }

    // Combine street number and route
    components.streetAddress = [streetNumber, route].filter(Boolean).join(" ");

    // If no suburb found, try to extract from city areas
    if (!components.suburb && components.city) {
      const neighborhoodComponent = place.address_components.find(
        (c) => c.types.includes("neighborhood") || c.types.includes("sublocality_level_2")
      );
      if (neighborhoodComponent) {
        components.suburb = neighborhoodComponent.long_name;
      }
    }

    return components;
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
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
    <div className="relative" ref={inputRef}>
      <input
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
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-100"
            >
              <div className="font-medium text-gray-900">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-xs text-gray-500">
                {suggestion.structured_formatting.secondary_text}
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
