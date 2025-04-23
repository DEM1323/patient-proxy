"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { Navigation } from "@/app/components/organisms/Navigation";
import { useAuth } from "@/app/contexts/AuthContext";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window !== "undefined") {
      // Get saved preference or default based on screen size
      const savedState = localStorage.getItem("sidebarCollapsed");
      if (savedState !== null) {
        return savedState === "true";
      }
      return window.innerWidth < 768;
    }
    return true; // Default for SSR
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, signOut } = useAuth();

  // Detect if we should show the sidebar
  useEffect(() => {
    const checkSidebarVisibility = async () => {
      console.log("MainLayout: Checking sidebar visibility...");
      console.log("MainLayout: Current pathname:", pathname);
      console.log("MainLayout: isAuthenticated:", isAuthenticated);

      // Determine if we're on the login page
      const isLoginPage = pathname === "/login";

      // Only show sidebar if authenticated and not on login page
      const shouldShowSidebar = isAuthenticated && !isLoginPage;
      console.log("MainLayout: Should show sidebar:", shouldShowSidebar);

      setShowSidebar(shouldShowSidebar);
      setIsLoading(false);
    };

    checkSidebarVisibility();

    // Listen for URL and history changes
    window.addEventListener("popstate", checkSidebarVisibility);

    return () => {
      window.removeEventListener("popstate", checkSidebarVisibility);
    };
  }, [pathname, isAuthenticated]);

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      const newCollapsedState = window.innerWidth < 768;
      setSidebarCollapsed(newCollapsedState);
      localStorage.setItem("sidebarCollapsed", String(newCollapsedState));
    };

    // Only add resize listener, don't force a state change on initial mount
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleLogout = async () => {
    try {
      const loadingToast = toast.loading("Logging out...");

      // Use the signOut function from AuthContext
      await signOut();

      toast.dismiss(loadingToast);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  const handleToggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };

  // If still loading, show content without sidebar
  if (isLoading) {
    console.log("MainLayout: LOADING - not showing sidebar yet");
    return <div className="h-screen w-screen">{children}</div>;
  }

  // If we shouldn't show sidebar, just return the children
  if (!showSidebar) {
    console.log(
      "MainLayout: NOT SHOWING SIDEBAR - user not logged in or on login page"
    );
    return <div className="h-screen w-screen">{children}</div>;
  }

  // Show layout with sidebar
  console.log("MainLayout: SHOWING SIDEBAR - user is logged in");
  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-[#fbf9fb]">
      {/* Navigation Sidebar */}
      <Navigation
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
};
