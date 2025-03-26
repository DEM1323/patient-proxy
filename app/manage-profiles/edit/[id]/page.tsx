"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Send, ArrowLeft } from "lucide-react";
import { PatientForm } from "@/app/components/organisms/PatientForm";
import type { PatientProfile } from "@/app/types/patient";
import { getProfile, saveProfile } from "@/app/lib/storage";
import { Button } from "@/app/components/ui/button";
import { toast } from "@/app/hooks/use-toast";
import { Toaster } from "@/app/components/ui/toaster";

export default function EditProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profileId = params.id as string;

    if (!profileId) {
      router.push("/manage-profiles/edit");
      return;
    }

    // Load the profile data
    const loadProfile = () => {
      try {
        const profileData = getProfile(profileId);

        if (!profileData) {
          toast({
            title: "Profile not found",
            description: "The requested profile could not be found.",
            variant: "destructive",
          });
          router.push("/manage-profiles/edit");
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error("Error loading profile:", error);
        toast({
          title: "Error loading profile",
          description: "There was an error loading the profile data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [params.id, router]);

  const handleSubmit = (updatedProfile: PatientProfile) => {
    try {
      // Ensure we keep the original ID
      if (profile?.id) {
        updatedProfile.id = profile.id;
      }

      // Save the updated profile
      saveProfile(updatedProfile);

      toast({
        title: "Profile updated",
        description: "The patient profile has been successfully updated.",
      });

      // Navigate back to the edit profiles list
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

  return (
    <>
      {/* Search Bar */}
      <div className="bg-white p-4">
        <div className="flex items-center bg-white rounded-md border border-[#015a8b] overflow-hidden h-12">
          <Search className="ml-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 p-2 text-sm sm:text-base outline-none"
          />
          <button className="bg-[#015a8b] h-full px-3 flex items-center justify-center">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 bg-white max-h-[90%]">
        <div className="bg-white p-4 rounded-md border border-[#015a8b] h-full flex flex-col">
          <div className="flex items-center mb-6">
            <Button
              onClick={() => router.push("/manage-profiles/edit")}
              variant="ghost"
              className="mr-2 p-1 h-8 w-8"
              aria-label="Back to Edit Profiles"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Edit Patient Profile
            </h1>
          </div>

          {/* Scrollable Patient Form Container */}
          <div className="flex-1 overflow-auto pr-2 -mr-2">
            <div className="w-full h-full">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-pulse text-center">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2 mx-auto"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
                  </div>
                </div>
              ) : profile ? (
                <PatientForm initialData={profile} onSubmit={handleSubmit} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Profile not found. Please select a different profile to edit.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toaster />
    </>
  );
}
