"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Navigation } from "@/app/components/organisms/Navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Detect if we should show the sidebar
  useEffect(() => {
    const checkSidebarVisibility = () => {
      console.log("MainLayout: Checking sidebar visibility...");
      console.log("MainLayout: Current pathname:", pathname);

      // Check URL parameters for bypass option
      const urlParams = new URLSearchParams(window.location.search);
      const bypassAuth = urlParams.get("bypass") === "true";
      console.log("MainLayout: URL bypass parameter:", bypassAuth);

      // Check localStorage for login flag
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      console.log("MainLayout: isLoggedIn from localStorage:", isLoggedIn);

      // Determine if we're on the home page without authentication
      const isHomePage = pathname === "/";
      const isLoginPage = pathname === "/login";

      // Don't show sidebar on login page or home page without auth
      const shouldShowSidebar = (bypassAuth || isLoggedIn) && !isLoginPage;
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
  }, [pathname]);

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleLogout = async () => {
    try {
      const loadingToast = toast.loading("Logging out...");

      // For testing: simulate logout with delay
      setTimeout(() => {
        toast.dismiss(loadingToast);
        toast.success("Logged out successfully");
        // Remove login flag
        localStorage.removeItem("isLoggedIn");
        // Redirect to home/login page
        window.location.href = "/";
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
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
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
};
