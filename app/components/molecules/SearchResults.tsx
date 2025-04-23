"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { type PatientProfile } from "@/app/types/patient";

interface SearchResultsProps {
  results: PatientProfile[];
  onSelect: (profile: PatientProfile) => void;
  isVisible: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelect,
  isVisible,
}) => {
  if (!isVisible || results.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#015a8b] rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
      {results.map((profile) => (
        <div
          key={profile.id}
          className="p-3 border-b border-gray-100 hover:bg-[#015a8b]/10 cursor-pointer"
          onClick={() => onSelect(profile)}
        >
          <div className="font-medium text-[#015a8b]">
            {profile.patientName}
          </div>
          <div className="text-sm text-gray-600 flex gap-2">
            <span>Age: {profile.age}</span>
            <span>•</span>
            <span>Gender: {profile.gender}</span>
          </div>
          {profile.diagnosis && (
            <div className="text-sm text-gray-500 mt-1 line-clamp-1">
              {profile.diagnosis}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
