import { PatientProfile, samplePatientProfile } from "@/app/types/patient";
import { saveProfileToDB, hasSampleProfile } from "./db-storage";
import { supabase } from "./supabase";

// Re-export the hasSampleProfile function for use in other files
export { hasSampleProfile };

/**
 * Ensures the user has access to a sample profile
 * This should be called when a user has no profiles
 */
export async function ensureSampleProfile(): Promise<PatientProfile | null> {
  // Check if user is authenticated
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    console.error("Cannot create sample profile: User not authenticated");
    return null;
  }

  // First check if user already has a sample profile in the database
  const alreadyHasSample = await hasSampleProfile();
  if (alreadyHasSample) {
    console.log("User already has a sample profile, not creating a new one");
    // Return null as we don't need to create a new one
    // The getProfiles will fetch the existing sample
    return null;
  }

  // Create a new sample profile specifically for this user
  const userId = data.session.user.id;
  const sampleId = `sample-${userId.substring(0, 8)}-${Date.now().toString(
    36
  )}`;

  const userSampleProfile: PatientProfile = {
    ...samplePatientProfile,
    id: sampleId,
  };

  // Save to database
  const savedProfile = await saveProfileToDB(userSampleProfile);
  return savedProfile;
}
