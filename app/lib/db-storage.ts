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
    // Get both user-specific profiles AND global profiles
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .or(`user_id.eq.${userId},is_global.eq.true`);

    if (error) {
      console.error("Error fetching profiles from Supabase:", error);
      return {};
    }

    // Log details about fetched profiles
    console.log(`[DB-STORAGE] Fetched ${data.length} total profiles`);
    const globalCount = data.filter((p) => p.is_global).length;
    console.log(
      `[DB-STORAGE] ${globalCount} global profiles, ${
        data.length - globalCount
      } user profiles`
    );

    if (globalCount > 0) {
      const globalIds = data.filter((p) => p.is_global).map((p) => p.id);
      console.log(`[DB-STORAGE] Global profile IDs: ${globalIds.join(", ")}`);
    }

    // Convert array to Record object with id as key
    const profilesRecord: Record<string, PatientProfile> = {};
    data.forEach((profile) => {
      // Parse JSON fields
      const parsedProfile = {
        ...profile.profile_data,
        id: profile.id,
        isGlobal: profile.is_global, // Mark as global based on is_global flag
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
      `[DB-STORAGE] Looking for profile with ID: "${id}" for user: "${userId}" or global profile`
    );

    // First, check if the profile exists without the user constraint
    const { data: anyUserData, error: anyUserError } = await supabase
      .from("patient_profiles")
      .select("id, user_id, is_global")
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
        // If profile exists but for a different user and is not global
        if (anyUserData[0].user_id !== userId && !anyUserData[0].is_global) {
          console.log(
            `[DB-STORAGE] Profile belongs to user ${anyUserData[0].user_id}, not current user ${userId} and is not global`
          );
        }
      }
    }

    // Now try to get the profile with user constraint or global flag
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("id", id)
      .or(`user_id.eq.${userId},is_global.eq.true`)
      .maybeSingle();

    if (error) {
      console.error(
        `[DB-STORAGE] Error fetching profile from Supabase: ${error.message}`
      );
      return null;
    }

    if (!data) {
      console.log(`[DB-STORAGE] No profile found with ID: "${id}"`);
      return null;
    }

    console.log(`[DB-STORAGE] Profile found with ID: "${id}"`);

    // Parse the profile data and include the is_global flag
    const parsedProfile = {
      ...data.profile_data,
      id: data.id,
      isGlobal: data.is_global, // Include the is_global flag from the table
    } as PatientProfile;

    return parsedProfile;
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
  profile: PatientProfile,
  isGlobal: boolean = false,
  allowEditGlobal: boolean = false
): Promise<PatientProfile | null> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return null;
  }

  try {
    console.log(
      `[DB-STORAGE] Attempting to save ${
        isGlobal ? "global " : ""
      }profile with ID: ${profile.id}`
    );

    // Check if trying to modify an existing global profile
    if (!isGlobal && !allowEditGlobal) {
      // Check if the profile is a global profile
      const { data: globalCheck, error: globalCheckError } = await supabase
        .from("patient_profiles")
        .select("is_global")
        .eq("id", profile.id)
        .eq("is_global", true)
        .maybeSingle();

      if (globalCheckError) {
        console.error(
          `[DB-STORAGE] Error checking if profile is global: ${globalCheckError.message}`
        );
      }

      // If this is a global profile and allowEditGlobal is false, prevent editing
      if (globalCheck && globalCheck.is_global === true) {
        console.error(
          `[DB-STORAGE] Attempt to modify global profile ${profile.id} was rejected`
        );
        return null;
      }
    }

    // For global profiles, ensure the ID follows the default-{patient_name} format
    if (isGlobal) {
      // Create a slug from patient name (lowercase, spaces to dashes)
      const nameSlug = profile.patientName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-"); // Replace spaces with dashes

      profile.id = `default-${nameSlug}`;
      console.log(`[DB-STORAGE] Generated global profile ID: ${profile.id}`);
    }
    // For non-global profiles, ensure the profile has an ID, if not generate one
    else if (!profile.id) {
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
    if (isSample && !profile.id.includes(userId) && !isGlobal) {
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

    // For global profiles, ensure the isGlobal property is set
    if (isGlobal) {
      profile.isGlobal = true;
    }

    // Check if the profile already exists
    let existingProfile = null;
    let existingProfileError = null;

    if (isGlobal) {
      // For global profiles, just check if it exists by ID
      const result = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", profile.id)
        .eq("is_global", true)
        .maybeSingle();

      existingProfile = result.data;
      existingProfileError = result.error;
    } else {
      // For user profiles, check by ID and user_id
      const result = await supabase
        .from("patient_profiles")
        .select("id")
        .eq("id", profile.id)
        .eq("user_id", userId)
        .maybeSingle();

      existingProfile = result.data;
      existingProfileError = result.error;
    }

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
        `[DB-STORAGE] Updating existing ${
          isGlobal ? "global " : ""
        }profile with ID: ${profile.id}`
      );

      // Update existing profile
      if (isGlobal) {
        result = await supabase
          .from("patient_profiles")
          .update({
            profile_data: profile,
            updated_at: new Date().toISOString(),
            is_sample: isSample,
            is_global: true,
          })
          .eq("id", profile.id)
          .eq("is_global", true)
          .select();
      } else {
        result = await supabase
          .from("patient_profiles")
          .update({
            profile_data: profile,
            updated_at: new Date().toISOString(),
            is_sample: isSample,
            is_global: false,
          })
          .eq("id", profile.id)
          .eq("user_id", userId)
          .select();
      }
    } else {
      console.log(
        `[DB-STORAGE] Creating new ${
          isGlobal ? "global " : ""
        }profile with ID: ${profile.id}`
      );

      // Insert new profile
      result = await supabase
        .from("patient_profiles")
        .insert({
          id: profile.id,
          user_id: userId, // We still store the creator's user_id even for global profiles
          profile_data: profile,
          is_sample: isSample,
          is_global: isGlobal,
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
      `[DB-STORAGE] Successfully saved ${
        isGlobal ? "global " : ""
      }profile with ID: ${profile.id}`
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

/**
 * Get all global profiles from Supabase that are available to all users
 */
export async function getGlobalProfilesFromDB(): Promise<
  Record<string, PatientProfile>
> {
  const userId = await getUserId();

  if (!userId) {
    console.error("User not authenticated");
    return {};
  }

  try {
    // Get only global profiles
    const { data, error } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("is_global", true);

    if (error) {
      console.error("Error fetching global profiles from Supabase:", error);
      return {};
    }

    // Convert array to Record object with id as key
    const profilesRecord: Record<string, PatientProfile> = {};
    data.forEach((profile) => {
      // Parse JSON fields
      const parsedProfile = {
        ...profile.profile_data,
        id: profile.id,
        isGlobal: true, // Always true for global profiles
      };
      profilesRecord[profile.id] = parsedProfile as PatientProfile;
    });

    console.log(`[DB-STORAGE] Fetched ${data.length} global profiles`);
    return profilesRecord;
  } catch (error) {
    console.error("Error getting global profiles from Supabase:", error);
    return {};
  }
}

/**
 * Debugging function to check if global profiles exist and are fetchable
 */
export async function debugGlobalProfiles(): Promise<any> {
  try {
    // Direct query for global profiles
    const { data: globalProfiles, error: globalError } = await supabase
      .from("patient_profiles")
      .select("*")
      .eq("is_global", true);

    if (globalError) {
      console.error("Error fetching global profiles:", globalError);
      return { error: globalError.message };
    }

    console.log(`[DEBUG] Found ${globalProfiles.length} global profiles`);

    if (globalProfiles.length > 0) {
      console.log(`[DEBUG] First global profile ID: ${globalProfiles[0].id}`);
      console.log(
        `[DEBUG] First global profile user_id: ${globalProfiles[0].user_id}`
      );
    }

    // Return a simplified version of the data for inspection
    return {
      count: globalProfiles.length,
      profiles: globalProfiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        is_global: p.is_global,
        patientName: p.profile_data?.patientName || "Unknown",
      })),
    };
  } catch (error) {
    console.error("Error in debugGlobalProfiles:", error);
    return { error: (error as Error).message };
  }
}
