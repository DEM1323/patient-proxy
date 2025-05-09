"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/app/components/organisms/PatientForm";
import type { PatientProfile } from "@/app/types/patient";
import { getProfile, saveProfile, getProfiles } from "@/app/lib/storage";
import { toast } from "@/app/hooks/use-toast";
import { Toaster } from "@/app/components/ui/toaster";
import { Button } from "@/app/components/ui/button";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { useAuth } from "@/app/contexts/AuthContext";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProfilePage({ params: paramsPromise }: PageProps) {
  const router = useRouter();
  const params = use(paramsPromise);
  const profileId = params.id;
  const { setNavigationState } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number | null>(null);

  useEffect(() => {
    // Fetch the profile data when component mounts
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const profileData = await getProfile(profileId);

        if (profileData) {
          setProfile(profileData);

          // If this is a global profile, show message and redirect back
          if (profileData.isGlobal) {
            toast({
              title: "Cannot edit default profile",
              description: "Default profiles cannot be modified.",
              variant: "destructive",
            });

            // Navigate back after a short delay
            setTimeout(() => {
              router.push("/manage-profiles/edit");
            }, 1500);
            return;
          }

          // Calculate and store the current page number
          const profilesObj = await getProfiles();
          const profiles = Object.values(profilesObj);
          const profileIndex = profiles.findIndex((p) => p.id === profileId);

          if (profileIndex !== -1) {
            const pageNumber = Math.floor(profileIndex / 1) + 1; // Using 1 as profilesPerPage
            setCurrentPage(pageNumber);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: "There was an error loading the profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, router]);

  const handleSubmit = async (updatedProfile: PatientProfile) => {
    try {
      // Ensure we're updating the existing profile by maintaining the ID
      const profileToSave = {
        ...updatedProfile,
        id: profileId, // Make sure we keep the same ID
      };

      console.log(`[EDIT] Starting profile update for ID: ${profileId}`);
      console.log(`[EDIT] Original profile ID: ${profile?.id}`);
      console.log(`[EDIT] Updated profile ID: ${updatedProfile.id}`);
      console.log(`[EDIT] Final save ID: ${profileToSave.id}`);

      // Save the profile
      const savedProfile = await saveProfile(profileToSave);

      if (!savedProfile) {
        throw new Error("Failed to save profile");
      }

      // Verify the ID is still correct
      console.log(`[EDIT] Saved profile ID: ${savedProfile.id}`);

      toast({
        title: "Profile updated",
        description: "The patient profile has been successfully updated.",
      });

      // Store current page in navigation state
      if (currentPage) {
        setNavigationState({
          returnToProfilePage: currentPage,
        });
      }

      // Navigate back to the profiles list after a short delay
      setTimeout(() => {
        router.push("/manage-profiles/edit");
      }, 1500);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "There was an error saving the profile data.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    // If we have a stored page number, use it for navigation
    if (currentPage) {
      setNavigationState({
        returnToProfilePage: currentPage,
      });
    }
    router.push("/manage-profiles/edit");
  };

  // Create the header with back button and title
  const Title = (
    <div className="flex items-center">
      <Button
        onClick={handleBack}
        variant="ghost"
        size="icon"
        className="h-8 w-8 mr-3 hover:bg-[#015a8b] rounded-full group"
        aria-label="Back to Edit Profiles"
      >
        <ArrowLeft className="h-5 w-5 text-[#015a8b] group-hover:text-white" />
      </Button>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold">
        Edit Patient Profile
      </span>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600">Profile not found</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Edit Profiles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col">
        <ContentLayout
          title={Title}
          onSearch={(term) => console.log("Search:", term)}
        >
          <PatientForm initialData={profile} onSubmit={handleSubmit} />
        </ContentLayout>
      </div>
      <Toaster />
    </>
  );
}
