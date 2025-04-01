"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/app/components/organisms/PatientForm";
import type { PatientProfile } from "@/app/types/patient";
import { getProfile, saveProfile, getProfiles } from "@/app/lib/storage";
import { toast } from "@/app/hooks/use-toast";
import { Toaster } from "@/app/components/ui/toaster";
import { Button } from "@/app/components/ui/button";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditProfilePage({ params }: PageProps) {
  const router = useRouter();
  const { id: profileId } = use(params);

  useEffect(() => {
    // Calculate and store the current page number when component mounts
    const profiles = Object.values(getProfiles());
    const profileIndex = profiles.findIndex((p) => p.id === profileId);
    if (profileIndex !== -1) {
      const pageNumber = Math.floor(profileIndex / 1) + 1; // Using 1 as profilesPerPage
      localStorage.setItem("currentEditPage", pageNumber.toString());
    }
  }, [profileId]);

  const handleSubmit = (profile: PatientProfile) => {
    try {
      // Save the profile
      saveProfile(profile);

      toast({
        title: "Profile updated",
        description: "The patient profile has been successfully updated.",
      });

      // Get the page to return to
      const returnPage = localStorage.getItem("returnToProfilePage");

      // Navigate back to the profiles page
      setTimeout(() => {
        if (returnPage) {
          localStorage.setItem("currentProfilePage", returnPage);
          localStorage.removeItem("returnToProfilePage");
        }
        router.push("/patient-profiles");
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
    // Get the stored page number
    const currentPage = localStorage.getItem("currentEditPage");
    if (currentPage) {
      localStorage.setItem("profileToEdit", profileId);
      localStorage.removeItem("currentEditPage");
    }
    router.push("/manage-profiles/edit");
  };

  // Create the header with back button and title
  const Title = (
    <div className="flex items-center">
      <Button
        onClick={handleBack}
        variant="ghost"
        className="mr-2 p-1 h-8 w-8"
        aria-label="Back to Edit Profiles"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold">
        Edit Patient Profile
      </span>
    </div>
  );

  // Get the profile data
  const profile = getProfile(profileId);

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
        <ContentLayout title={Title}>
          <PatientForm initialData={profile} onSubmit={handleSubmit} />
        </ContentLayout>
      </div>
      <Toaster />
    </>
  );
}
