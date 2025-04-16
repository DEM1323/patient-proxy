"use client";

import { useState, useEffect } from "react";
import { Edit, Plus, RefreshCw } from "lucide-react";
import { type PatientProfile, samplePatientProfile } from "@/app/types/patient";
import { getProfiles, saveProfile } from "@/app/lib/storage";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ProfileList } from "@/app/components/organisms/ProfileList";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { supabase } from "@/app/lib/supabase";
import toast from "react-hot-toast";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  ensureSampleProfile,
  hasSampleProfile,
} from "@/app/lib/data-migration";

export default function PatientProfilesPage() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, navigationState, setNavigationState } =
    useAuth();

  useEffect(() => {
    // Check for Supabase authentication
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();

      // Show success message if we're coming from authentication
      if (data.session) {
        if (searchParams.get("auth") === "true") {
          toast.success("Login successful!");
          // Remove the auth parameter from the URL without a page reload
          window.history.replaceState({}, "", "/patient-profiles");
        }

        // Load profiles if authenticated
        loadProfiles();
      } else {
        // Redirect to login if not authenticated
        router.push("/login?redirect=/patient-profiles");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, searchParams]);

  // Check for saved navigation state when component mounts
  useEffect(() => {
    if (navigationState.currentProfilePage) {
      setCurrentPage(navigationState.currentProfilePage);
      // Clear the navigation state after using it
      setNavigationState({
        ...navigationState,
        currentProfilePage: undefined,
      });
    }
  }, [navigationState, setNavigationState]);

  // Load profiles function
  const loadProfiles = async () => {
    try {
      // Get profiles using the async function
      const profilesObj = await getProfiles();
      let profilesList = Object.values(profilesObj);

      // If no profiles exist yet, this is an unusual case
      // The auth callback should have created a sample profile already
      if (profilesList.length === 0 && isAuthenticated) {
        console.log(
          "No profiles found despite authenticated user - unusual case"
        );

        // Double-check if a sample profile should exist
        const alreadyHasSample = await hasSampleProfile();

        if (!alreadyHasSample) {
          console.log("No sample profile found, creating one as fallback");
          // Try creating a sample profile as a fallback
          const savedSampleProfile = await ensureSampleProfile();

          if (savedSampleProfile) {
            profilesList = [savedSampleProfile];
            toast.success("A sample patient profile has been created for you");
          }
        } else {
          // If we know a sample exists but couldn't fetch it, refresh the profiles
          console.log("Sample profile exists but wasn't fetched, trying again");
          const refreshedProfiles = await getProfiles();
          profilesList = Object.values(refreshedProfiles);

          if (profilesList.length > 0) {
            toast.success("Your existing profiles have been loaded");
          }
        }
      }

      setProfiles(profilesList);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading profiles:", error);
      // Fallback to sample profile without saving
      setProfiles([samplePatientProfile]);
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (profiles.length > 0) {
      // Store the current profile ID and page number in AuthContext
      const startIndex = (currentPage - 1) * 1; // Using 1 as profilesPerPage
      const currentProfile = profiles[startIndex];

      // Save state in the AuthContext
      setNavigationState({
        profileToEdit: currentProfile.id,
        returnToProfilePage: currentPage,
      });

      // Navigate to the edit profiles page
      router.push("/manage-profiles/edit");
    }
  };

  // Function to handle manual sample profile creation
  const handleCreateSampleProfile = async () => {
    try {
      setIsLoading(true);

      // Try creating a sample profile through the API
      const response = await fetch("/api/ensure-sample-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create sample profile");
      }

      const result = await response.json();

      if (result.created) {
        toast.success("Sample profile created successfully");
      } else {
        toast.success("Sample profile already exists, refreshing...");
      }

      // Reload profiles
      await loadProfiles();
    } catch (error) {
      console.error("Error creating sample profile:", error);
      toast.error("Failed to create sample profile");
      setIsLoading(false);
    }
  };

  // Track page changes and update navigation state
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Store current page in AuthContext
    setNavigationState({
      ...navigationState,
      currentProfilePage: page,
    });
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
      {profiles.length > 0 ? (
        <Button
          onClick={handleEditProfile}
          variant="secondary"
          className="flex items-center"
        >
          <Edit className="mr-1 h-4 w-4" />
          Manage Profile
        </Button>
      ) : (
        <Button
          onClick={handleCreateSampleProfile}
          variant="secondary"
          className="flex items-center"
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          Create Sample Profile
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
      <ProfileList
        profiles={profiles}
        profilesPerPage={1}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
    </ContentLayout>
  );
}
