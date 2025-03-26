"use client";

import React, { useState, useEffect } from "react";
import { PatientCard } from "@/app/components/organisms/PatientCard";
import { PaginationControl } from "@/app/components/molecules/PaginationControl";
import { type PatientProfile } from "@/app/types/patient";

interface ProfileListProps {
  profiles: PatientProfile[];
  profilesPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  profilesPerPage = 1,
  currentPage: externalCurrentPage,
  onPageChange,
}) => {
  const [internalCurrentPage, setInternalCurrentPage] = useState(1);

  // Use either the external page or internal state
  const currentPage =
    externalCurrentPage !== undefined
      ? externalCurrentPage
      : internalCurrentPage;

  // Handle page changes based on whether external control is used
  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalCurrentPage(page);
    }
  };

  // Update internal page if external page changes
  useEffect(() => {
    if (externalCurrentPage !== undefined) {
      setInternalCurrentPage(externalCurrentPage);
    }
  }, [externalCurrentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(profiles.length / profilesPerPage);

  // Get profiles for current page
  const startIndex = (currentPage - 1) * profilesPerPage;
  const currentProfiles = profiles.slice(
    startIndex,
    startIndex + profilesPerPage
  );

  return (
    <div className="w-full flex flex-col h-full">
      {profiles.length > 0 ? (
        <>
          <div className="border border-[#97a8b5] h-full overflow-auto">
            {currentProfiles.map((profile) => (
              <PatientCard key={profile.id} profile={profile} />
            ))}
          </div>

          {/* Always show pagination when there are profiles, even if just one page */}
          <div className="mt-4 py-2 flex-shrink-0">
            <PaginationControl
              currentPage={currentPage}
              totalPages={Math.max(1, totalPages)}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 border border-[#97a8b5] rounded-md">
          No patient profiles found. Create a new profile to get started.
        </div>
      )}
    </div>
  );
};
