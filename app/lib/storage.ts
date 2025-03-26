import type { PatientProfile } from "@/app/types/patient";

// Key for storing profiles in localStorage
const PROFILES_STORAGE_KEY = "patient-profiles";

// Get all profiles from localStorage
export function getProfiles(): Record<string, PatientProfile> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const profilesJson = localStorage.getItem(PROFILES_STORAGE_KEY);
    return profilesJson ? JSON.parse(profilesJson) : {};
  } catch (error) {
    console.error("Error getting profiles from localStorage:", error);
    return {};
  }
}

// Get a single profile by ID
export function getProfile(id: string): PatientProfile | null {
  const profiles = getProfiles();
  return profiles[id] || null;
}

// Save a profile to localStorage
export function saveProfile(profile: PatientProfile): PatientProfile {
  // Ensure the profile has an ID
  if (!profile.id) {
    profile.id = generateId();
  }

  try {
    const profiles = getProfiles();
    profiles[profile.id] = profile;
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return profile;
  } catch (error) {
    console.error("Error saving profile to localStorage:", error);
    return profile;
  }
}

// Delete a profile from localStorage
export function deleteProfile(id: string): boolean {
  try {
    const profiles = getProfiles();
    if (profiles[id]) {
      delete profiles[id];
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting profile from localStorage:", error);
    return false;
  }
}

// Generate a unique ID for new profiles
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
