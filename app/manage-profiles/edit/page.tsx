"use client";

import { useState, useEffect } from "react";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
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

import { useRouter } from "next/navigation";
import { getProfiles, deleteProfile } from "@/app/lib/storage";
import type { PatientProfile } from "@/app/types/patient";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { ProfileList } from "@/app/components/organisms/ProfileList";
import { useAuth } from "@/app/contexts/AuthContext";

export default function EditProfiles() {
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const profilesPerPage = 1;
  const router = useRouter();
  const { navigationState, setNavigationState } = useAuth();

  useEffect(() => {
    // Load profiles from database when component mounts
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        const profilesObj = await getProfiles();
        let profilesList = Object.values(profilesObj);

        // If no profiles exist yet, show a message instead of adding a sample
        setProfiles(profilesList);

        // Check if there's a profile to edit from navigation state
        if (navigationState.profileToEdit) {
          const profileToEditId = navigationState.profileToEdit;

          // Find the index of the profile in the list
          const profileIndex = profilesList.findIndex(
            (profile) => profile.id === profileToEditId
          );

          if (profileIndex !== -1) {
            // Calculate which page this profile would be on
            const pageNumber = Math.floor(profileIndex / profilesPerPage) + 1;
            setCurrentPage(pageNumber);
          }

          // Clear the navigation state
          setNavigationState({
            ...navigationState,
            profileToEdit: undefined,
          });
        }
        // Or check if there's a page to return to
        else if (navigationState.returnToProfilePage) {
          setCurrentPage(navigationState.returnToProfilePage);

          // Clear the navigation state
          setNavigationState({
            ...navigationState,
            returnToProfilePage: undefined,
          });
        }
      } catch (error) {
        console.error("Error loading profiles:", error);
        setProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [navigationState, setNavigationState]);

  // Track page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Store in navigation state
    setNavigationState({
      ...navigationState,
      currentProfilePage: page,
    });
  };

  // Calculate pagination
  const startIndex = (currentPage - 1) * profilesPerPage;
  const currentProfiles = profiles.slice(
    startIndex,
    startIndex + profilesPerPage
  );

  const handleEditProfile = (profileId: string) => {
    // Save in navigation state before navigating
    setNavigationState({
      ...navigationState,
      profileToEdit: profileId,
    });

    // Navigate to edit form for this profile
    router.push(`/manage-profiles/edit/${profileId}`);
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfileToDelete(profileId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (profileToDelete) {
      try {
        const success = await deleteProfile(profileToDelete);

        if (success) {
          // Update the profiles list
          setProfiles(
            profiles.filter((profile) => profile.id !== profileToDelete)
          );

          // Adjust current page if needed
          if (currentProfiles.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
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
        onClick={() => {
          // Store current page in navigation state
          setNavigationState({
            ...navigationState,
            returnToProfilePage: currentPage,
          });
          router.push("/manage-profiles");
        }}
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
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No patient profiles found. Please create a new profile.
          </div>
        ) : (
          <ProfileList
            profiles={profiles}
            profilesPerPage={1}
            currentPage={currentPage}
            onPageChange={handlePageChange}
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
