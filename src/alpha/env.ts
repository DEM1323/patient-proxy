export const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim() ?? "";
export const workosClientId =
  import.meta.env.VITE_WORKOS_CLIENT_ID?.trim() ?? "";
export const workosRedirectUri =
  import.meta.env.VITE_WORKOS_REDIRECT_URI?.trim() ?? "";

export const isConvexConfigured = convexUrl.length > 0;
export const isMembershipAccessConfigured =
  isConvexConfigured &&
  workosClientId.length > 0 &&
  workosRedirectUri.length > 0;
