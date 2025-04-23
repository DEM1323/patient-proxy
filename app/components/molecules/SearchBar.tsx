"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { getProfiles } from "@/app/lib/storage";
import { type PatientProfile } from "@/app/types/patient";
import { SearchResults } from "./SearchResults";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search patient profiles...",
  onSearch,
}) => {
  const router = useRouter();
  const { setNavigationState } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<PatientProfile[]>(
    []
  );
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load all profiles once when component mounts
  useEffect(() => {
    const loadAllProfiles = async () => {
      try {
        setIsLoading(true);
        const profilesObj = await getProfiles();
        const profilesList = Object.values(profilesObj);
        setProfiles(profilesList);
      } catch (error) {
        console.error("Error loading profiles for search:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllProfiles();
  }, []);

  // Filter profiles based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProfiles([]);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = profiles.filter((profile) => {
      // Search in multiple fields
      return (
        profile.patientName?.toLowerCase().includes(searchTermLower) ||
        profile.diagnosis?.toLowerCase().includes(searchTermLower) ||
        profile.history?.toLowerCase().includes(searchTermLower) ||
        profile.case?.toLowerCase().includes(searchTermLower) ||
        profile.gender?.toLowerCase().includes(searchTermLower) ||
        profile.age?.toString().includes(searchTermLower)
      );
    });

    setFilteredProfiles(filtered);
  }, [searchTerm, profiles]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowResults(true);
    }
  };

  const handleProfileSelect = (profile: PatientProfile) => {
    // Find the page number for this profile
    const profileIndex = profiles.findIndex((p) => p.id === profile.id);
    const page = profileIndex + 1; // Assuming 1 profile per page

    // Set navigation state
    setNavigationState({
      currentProfilePage: page,
    });

    // Navigate to the patient profiles page
    router.push("/patient-profiles");

    // Hide search results
    setShowResults(false);

    // Clear search term
    setSearchTerm("");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredProfiles([]);
    setShowResults(false);
  };

  return (
    <div className="relative" ref={searchContainerRef}>
      <div className="flex items-center bg-white rounded-md border border-[#015a8b] overflow-hidden h-12">
        <Search className="ml-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.trim()) {
              setShowResults(true);
            } else {
              setShowResults(false);
            }
          }}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className="flex-1 p-2 text-sm sm:text-base outline-none"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="text-gray-500 hover:text-gray-700 px-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <SearchResults
        results={filteredProfiles}
        onSelect={handleProfileSelect}
        isVisible={showResults}
      />
    </div>
  );
};
