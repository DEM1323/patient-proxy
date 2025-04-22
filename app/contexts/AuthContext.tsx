"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/app/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

// Add interface for temporary session data that doesn't need localStorage
interface NavigationState {
  profileToEdit?: string;
  returnToProfilePage?: number;
  currentProfilePage?: number;
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  navigationState: NavigationState;
  setNavigationState: (state: NavigationState) => void;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  isAuthenticated: false,
  navigationState: {},
  setNavigationState: () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigationState, setNavigationState] = useState<NavigationState>({});

  // Function to synchronize server-side cookies with client-side auth state
  const syncSupabaseCookies = async (
    event: string,
    session: Session | null
  ) => {
    try {
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ event, session }),
      });
      console.log("Auth cookies synchronized with server");
    } catch (error) {
      console.error("Failed to synchronize auth cookies:", error);
    }
  };

  useEffect(() => {
    // Check for existing session
    const getSession = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
      }

      setSession(data.session);
      setUser(data.session?.user || null);

      // Sync cookies on initial session check if session exists
      if (data.session) {
        await syncSupabaseCookies("SIGNED_IN", data.session);
      }

      setIsLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state change:", event);
        setSession(newSession);
        setUser(newSession?.user || null);

        // Sync cookies on auth state changes
        await syncSupabaseCookies(event, newSession);

        setIsLoading(false);

        // Reset navigation state on sign out
        if (event === "SIGNED_OUT") {
          setNavigationState({});
        }
      }
    );

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Reset navigation state
      setNavigationState({});

      // Use window.location for a complete reset rather than Next.js router
      // This ensures all React state is cleared and auth state is reset
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      // Still try to redirect even if there was an error
      window.location.href = "/";
    }
  };

  const updateNavigationState = (newState: NavigationState) => {
    setNavigationState((prevState) => ({
      ...prevState,
      ...newState,
    }));
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
    isAuthenticated: !!user,
    navigationState,
    setNavigationState: updateNavigationState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
