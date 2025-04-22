import type { PatientProfile } from "@/app/types/patient";
import { supabase, getUserId } from "./supabase";

/**
 * Get all patient profiles for the current user from Supabase
 */
export async function getProfilesFromDB(): Promise<
  Record<string, PatientProfile>
> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return {};
  }

  try {
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching profiles from Supabase:", error);
      return {};
    }

    // Convert array to Record object with id as key
    const profilesRecord: Record<string, PatientProfile> = {};
    data.forEach((profile) => {
      // Parse JSON fields
      const parsedProfile = {
        ...profile.profile_data,
        id: profile.id,
      };
      profilesRecord[profile.id] = parsedProfile as PatientProfile;
    });

    return profilesRecord;
  } catch (error) {
    console.error("Error getting profiles from Supabase:", error);
    return {};
  }
}

/**
 * Get a single patient profile by ID from Supabase
 */
export async function getProfileFromDB(
  id: string
): Promise<PatientProfile | null> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return null;
  }

  try {
    console.log(
      `[DB-STORAGE] Looking for profile with ID: "${id}" for user: "${userId}"`
    );

    // First, check if the profile exists without the user constraint
    const { data: anyUserData, error: anyUserError } = await supabase
      .from("patient_profiles")
      .select("id, user_id")
      .eq("id", id);

    if (anyUserError) {
      console.error(
        "[DB-STORAGE] Error checking profile existence:",
        anyUserError
      );
    } else {
      console.log(
        `[DB-STORAGE] Profile existence check: Found ${
          anyUserData?.length || 0
        } profiles with this ID`
      );
      if (anyUserData && anyUserData.length > 0) {
        // If profile exists but for a different user
        if (anyUserData[0].user_id !== userId) {
          console.log(
            `[DB-STORAGE] Profile belongs to user ${anyUserData[0].user_id}, not current user ${userId}`
          );
        }
      }
    }

    // Now try to get the profile with user constraint
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error(
        `[DB-STORAGE] Error fetching profile from Supabase: ${error.message}`
      );
      return null;
    }

    console.log(`[DB-STORAGE] Profile found with ID: "${id}"`);

    // Parse the profile data
    return {
      ...data.profile_data,
      id: data.id,
    } as PatientProfile;
  } catch (error) {
    console.error(
      `[DB-STORAGE] Error getting profile from Supabase: ${
        (error as Error).message
      }`
    );
    return null;
  }
}

/**
 * Save a patient profile to Supabase
 */
export async function saveProfileToDB(
  profile: PatientProfile
): Promise<PatientProfile | null> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return null;
  }

  try {
    console.log(
      `[DB-STORAGE] Attempting to save profile with ID: ${profile.id}`
    );

    // Ensure the profile has an ID, if not generate one
    if (!profile.id) {
      profile.id = generateId();
      console.log(
        `[DB-STORAGE] No ID provided, generated new ID: ${profile.id}`
      );
    }

    // Check if this is a sample profile
    const isSample =
      profile.id === "sample-1" || profile.id.startsWith("sample-");

    // If this is a sample profile, make sure it's unique to this user
    // BUT only do this for NEW profiles, not EXISTING ones that are being edited
    if (isSample && !profile.id.includes(userId)) {
      const originalId = profile.id;

      // Check if this profile already exists
      const { data: sampleExists } = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", profile.id)
        .eq("user_id", userId)
        .maybeSingle();

      // Only change the ID if it's a new sample profile, not an edit of an existing one
      if (!sampleExists) {
        // Create a unique sample ID for this user
        profile.id = `sample-${userId.substring(0, 8)}-${Date.now().toString(
          36
        )}`;
        console.log(
          `[DB-STORAGE] New sample profile ID changed from ${originalId} to ${profile.id}`
        );
      } else {
        console.log(
          `[DB-STORAGE] Keeping existing sample profile ID: ${profile.id}`
        );
      }
    }

    // Check if the profile already exists
    const { data: existingProfile, error: existingProfileError } =
      await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", profile.id)
        .eq("user_id", userId)
        .maybeSingle();

    if (existingProfileError) {
      console.error(
        `[DB-STORAGE] Error checking if profile exists: ${existingProfileError.message}`
      );
    }

    console.log(
      `[DB-STORAGE] Profile exists check: `,
      existingProfile ? "Found existing profile" : "No existing profile found"
    );

    let result;

    if (existingProfile) {
      console.log(
        `[DB-STORAGE] Updating existing profile with ID: ${profile.id}`
      );

      // Update existing profile
      result = await supabase
        .from("patient_profiles")
        .update({
          profile_data: profile,
          updated_at: new Date().toISOString(),
          is_sample: isSample,
        })
        .eq("id", profile.id)
        .eq("user_id", userId)
        .select();
    } else {
      console.log(`[DB-STORAGE] Creating new profile with ID: ${profile.id}`);

      // Insert new profile
      result = await supabase
        .from("patient_profiles")
        .insert({
          id: profile.id,
          user_id: userId,
          profile_data: profile,
          is_sample: isSample,
        })
        .select();
    }

    if (result.error) {
      console.error(
        `[DB-STORAGE] Error saving profile to Supabase: ${result.error.message}`
      );
      return null;
    }

    console.log(
      `[DB-STORAGE] Successfully saved profile with ID: ${profile.id}`
    );
    return profile;
  } catch (error) {
    console.error(
      `[DB-STORAGE] Error saving profile to Supabase: ${
        (error as Error).message
      }`
    );
    return null;
  }
}

/**
 * Delete a patient profile from Supabase
 */
export async function deleteProfileFromDB(id: string): Promise<boolean> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return false;
  }

  try {
    const { error } = await supabase
      .from("patient_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting profile from Supabase:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting profile from Supabase:", error);
    return false;
  }
}

/**
 * Generate a unique ID for new profiles
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Check if user already has a sample profile
 */
export async function hasSampleProfile(): Promise<boolean> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return false;
  }

  try {
    const { error, count } = await supabase
      .from("patient_profiles")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_sample", true);

    if (error) {
      console.error("Error checking for sample profiles:", error);
      return false;
    }

    return count ? count > 0 : false;
  } catch (error) {
    console.error("Error checking for sample profiles:", error);
    return false;
  }
}
