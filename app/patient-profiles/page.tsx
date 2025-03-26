"use client";

import { useState, useEffect } from "react";
import { Edit, Plus } from "lucide-react";
import { type PatientProfile, samplePatientProfile } from "@/app/types/patient";
import { getProfiles, saveProfile } from "@/app/lib/storage";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ProfileList } from "@/app/components/organisms/ProfileList";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";

export default function PatientProfilesPage() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load profiles immediately - authentication is handled by AppLayout
    loadProfiles();
  }, []);

  // Load profiles function
  const loadProfiles = () => {
    try {
      const profilesObj = getProfiles();
      let profilesList = Object.values(profilesObj);

      // If no profiles exist yet, add the sample profile to localStorage
      if (profilesList.length === 0) {
        // Save the sample profile to localStorage
        const savedSampleProfile = saveProfile(samplePatientProfile);
        profilesList = [savedSampleProfile];
      }

      setProfiles(profilesList);
      setIsLoading(false);

      // Check if there's a last created profile ID to navigate to
      const lastCreatedProfileId = localStorage.getItem("lastCreatedProfileId");
      if (lastCreatedProfileId) {
        // Clear the stored ID so it doesn't affect future navigation
        localStorage.removeItem("lastCreatedProfileId");
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
      // Fallback to sample profile without saving
      setProfiles([samplePatientProfile]);
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (profiles.length > 0) {
      // Store the current profile ID for the edit page to use
      localStorage.setItem("profileToEdit", profiles[0].id);

      // Navigate to the edit profiles page
      router.push("/manage-profiles/edit");
    }
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  // Content for the patient profiles page using ContentLayout
  const Actions = (
    <>
      {profiles.length > 0 && (
        <Button
          onClick={handleEditProfile}
          variant="secondary"
          className="flex items-center"
        >
          <Edit className="mr-1 h-4 w-4" />
          Edit Profile
        </Button>
      )}
      <Button
        onClick={() => router.push("/manage-profiles/create")}
        className="flex items-center"
      >
        <Plus className="mr-1 h-4 w-4" />
        New Profile
      </Button>
    </>
  );

  return (
    <ContentLayout
      title="Patient Profiles"
      actions={Actions}
      onSearch={(term) => console.log("Search:", term)}
    >
      <ProfileList profiles={profiles} profilesPerPage={1} />
    </ContentLayout>
  );
}
