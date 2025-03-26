"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
import { type PatientProfile, samplePatientProfile } from "@/app/types/patient";
import { getProfiles, saveProfile, deleteProfile } from "@/app/lib/storage";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { ProfileList } from "@/app/components/organisms/ProfileList";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";

export default function EditProfiles() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const profilesPerPage = 1;
  const router = useRouter();

  useEffect(() => {
    // Load profiles from storage when component mounts
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

        // Check if there's a profile to edit
        const profileToEditId = localStorage.getItem("profileToEdit");
        if (profileToEditId) {
          // Find the index of the profile in the list
          const profileIndex = profilesList.findIndex(
            (profile) => profile.id === profileToEditId
          );
          if (profileIndex !== -1) {
            // Calculate which page this profile would be on
            const pageNumber = Math.floor(profileIndex / profilesPerPage) + 1;
            setCurrentPage(pageNumber);
          }

          // Clear the stored ID so it doesn't affect future navigation
          localStorage.removeItem("profileToEdit");
        }
      } catch (error) {
        console.error("Error loading profiles:", error);
        // Fallback to sample profile without saving
        setProfiles([samplePatientProfile]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(profiles.length / profilesPerPage);
  const startIndex = (currentPage - 1) * profilesPerPage;
  const currentProfiles = profiles.slice(
    startIndex,
    startIndex + profilesPerPage
  );

  const handleEditProfile = (profileId: string) => {
    // Navigate to edit form for this profile
    router.push(`/manage-profiles/edit/${profileId}`);
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfileToDelete(profileId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (profileToDelete) {
      try {
        deleteProfile(profileToDelete);

        // Update the profiles list
        setProfiles(
          profiles.filter((profile) => profile.id !== profileToDelete)
        );

        // Adjust current page if needed
        if (currentProfiles.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (error) {
        console.error("Error deleting profile:", error);
      }
    }
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
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
        Edit Patient Profiles
      </span>
    </div>
  );

  // Create action buttons
  const Actions =
    !isLoading && currentProfiles.length > 0 ? (
      <>
        <Button
          onClick={() => handleEditProfile(currentProfiles[0].id)}
          className="flex items-center bg-[#015a8b] hover:bg-[#216f99] text-white"
        >
          <Edit className="mr-1 h-4 w-4" />
          Edit Profile
        </Button>
        <Button
          onClick={() => handleDeleteProfile(currentProfiles[0].id)}
          className="flex items-center bg-red-500 hover:bg-red-600 text-white"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete Profile
        </Button>
      </>
    ) : null;

  return (
    <>
      <ContentLayout
        title={Title}
        actions={Actions}
        onSearch={(term) => console.log("Search:", term)}
      >
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading profiles...
          </div>
        ) : (
          <ProfileList
            profiles={profiles}
            profilesPerPage={1}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </ContentLayout>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this profile?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              patient profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
