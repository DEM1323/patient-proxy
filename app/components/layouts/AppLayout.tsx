"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Navigation } from "@/app/components/organisms/Navigation";
import { useAuth } from "@/app/contexts/AuthContext";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { isAuthenticated, isLoading, signOut } = useAuth();

  // Check authentication
  useEffect(() => {
    // If not authenticated, redirect to landing page
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

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

      // Use the signOut function from AuthContext
      await signOut();

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout");
    }
  };

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show layout with Navigation
  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-[#fbf9fb]">
      {/* Navigation */}
      <Navigation
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}
