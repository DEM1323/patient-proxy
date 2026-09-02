import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { useCallback, type ReactNode } from "react";
import {
  ConvexProviderWithAuth,
  type ConvexReactClient,
} from "convex/react";
import { workosClientId, workosRedirectUri } from "../../env";

export function MembershipAccessProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: ConvexReactClient;
}) {
  return (
    <AuthKitProvider
      clientId={workosClientId}
      devMode
      redirectUri={workosRedirectUri}
      onRedirectCallback={() => window.location.replace("/")}
    >
      <ConvexProviderWithAuth client={client} useAuth={useAuthFromWorkOS}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}

function useAuthFromWorkOS() {
  const { getAccessToken, isLoading, user } = useAuth();
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) {
        return null;
      }
      return await getAccessToken({ forceRefresh: forceRefreshToken });
    },
    [getAccessToken, user],
  );

  return {
    isLoading,
    isAuthenticated: user !== null,
    fetchAccessToken,
  };
}
