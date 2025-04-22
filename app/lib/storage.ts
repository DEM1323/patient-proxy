import type { PatientProfile } from "@/app/types/patient";
import {
  getProfilesFromDB,
  getProfileFromDB,
  saveProfileToDB,
  deleteProfileFromDB,
} from "./db-storage";
import { supabase } from "./supabase";

// Check if the user is authenticated
async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// Get all profiles from Supabase
export async function getProfiles(): Promise<Record<string, PatientProfile>> {
  if (await isAuthenticated()) {
    return await getProfilesFromDB();
  }

  // Return empty object if not authenticated
  console.log("User not authenticated, returning empty profiles list");
  return {};
}

// Get a single profile by ID
export async function getProfile(id: string): Promise<PatientProfile | null> {
  if (await isAuthenticated()) {
    console.log(`Looking up profile with ID: ${id} from database`);
    const profile = await getProfileFromDB(id);
    if (!profile) {
      console.log(`Profile with ID ${id} not found in database`);
    }
    return profile;
  }

  // Return null if not authenticated
  console.log("User not authenticated, cannot get profile");
  return null;
}

// Save a profile to Supabase
export async function saveProfile(
  profile: PatientProfile
): Promise<PatientProfile> {
  console.log(`[STORAGE] Saving profile with ID: ${profile.id}`);

  if (await isAuthenticated()) {
    const savedProfile = await saveProfileToDB(profile);
    if (savedProfile) {
      console.log(
        `[STORAGE] Successfully saved profile with ID: ${savedProfile.id}`
      );
      return savedProfile;
    }
    console.log(
      `[STORAGE] Failed to save profile, saveProfileToDB returned null`
    );
  } else {
    console.log(`[STORAGE] Not authenticated, cannot save profile`);
  }

  // If we couldn't save (not authenticated or error), return the original profile
  console.log(`[STORAGE] Returning original profile with ID: ${profile.id}`);
  return profile;
}

// Delete a profile from Supabase
export async function deleteProfile(id: string): Promise<boolean> {
  if (await isAuthenticated()) {
    return await deleteProfileFromDB(id);
  }

  return false;
}
