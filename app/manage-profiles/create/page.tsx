"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/app/components/organisms/PatientForm";
import type { PatientProfile } from "@/app/types/patient";
import { saveProfile, getProfiles } from "@/app/lib/storage";
import { toast } from "@/app/hooks/use-toast";
import { Toaster } from "@/app/components/ui/toaster";
import { Button } from "@/app/components/ui/button";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";

export default function CreateProfile() {
  const router = useRouter();

  const handleSubmit = (profile: PatientProfile) => {
    try {
      // Save the profile
      const savedProfile = saveProfile(profile);

      // Get all profiles to calculate the page number
      const profilesObj = getProfiles();
      const profilesList = Object.values(profilesObj);
      const profileIndex = profilesList.findIndex(
        (p) => p.id === savedProfile.id
      );
      const pageNumber = Math.floor(profileIndex / 1) + 1; // Using 1 as profilesPerPage

      toast({
        title: "Profile created",
        description: "The patient profile has been successfully created.",
      });

      // Navigate to the patient profiles page with the correct page number
      setTimeout(() => {
        localStorage.setItem("currentProfilePage", pageNumber.toString());
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

  // Create the header with back button and title
  const Title = (
    <div className="flex items-center">
      <Button
        onClick={() => router.push("/manage-profiles")}
        variant="ghost"
        className="mr-2 p-1 h-8 w-8"
        aria-label="Back to Manage Profiles"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold">
        Create a New Patient Profile
      </span>
    </div>
  );

  return (
    <>
      <div className="h-screen flex flex-col">
        <ContentLayout
          title={Title}
          onSearch={(term) => console.log("Search:", term)}
        >
          <PatientForm onSubmit={handleSubmit} />
        </ContentLayout>
      </div>
      <Toaster />
    </>
  );
}
