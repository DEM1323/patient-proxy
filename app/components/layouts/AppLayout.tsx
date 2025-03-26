"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, LogOut, Menu } from "lucide-react";
import { SidebarLink } from "@/app/components/atoms/SidebarLink";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      // Check URL parameters for bypass option
      const urlParams = new URLSearchParams(window.location.search);
      const bypassAuth = urlParams.get("bypass") === "true";

      // Check localStorage for login flag
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

      // If not authenticated and not bypassing, redirect to landing page
      if (!bypassAuth && !isLoggedIn) {
        console.log(
          "AppLayout: Not authenticated, redirecting to landing page"
        );
        router.push("/");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

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
        // Redirect to landing page
        window.location.href = "/";
      }, 1000);
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

  // Show layout with sidebar
  return (
    <div className="flex h-screen w-screen max-w-full overflow-hidden bg-[#fbf9fb]">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onLogout,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-width duration-300 flex flex-col bg-[#015a8b]/50 flex-shrink-0`}
    >
      <div className="p-4 bg-[#015a8b] border-b border-white flex justify-between items-start">
        {!collapsed && (
          <div className="flex-1 pr-8">
            <h1 className="text-white text-base sm:text-lg md:text-xl font-bold truncate whitespace-nowrap">
              Patient Proxy
            </h1>
            <p className="text-white text-xs sm:text-sm truncate whitespace-nowrap">
              v1.0
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`text-white hover:bg-[#216f99]/80 p-1 rounded-md flex-shrink-0 ${
            collapsed ? "mx-auto" : "ml-2"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          <SidebarLink
            href="/patient-profiles?bypass=true"
            label={collapsed ? "" : "Patient Profiles"}
            icon="📋"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/manage-profiles?bypass=true"
            label={collapsed ? "" : "Manage Profiles"}
            icon="✨"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/patient-simulations?bypass=true"
            label={collapsed ? "" : "Patient Simulations"}
            icon="🏥"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/report-bug?bypass=true"
            label={collapsed ? "" : "Report a Bug"}
            icon="ℹ️"
            collapsed={collapsed}
          />
        </nav>
      </div>

      <div className="mt-auto py-4 border-t border-white">
        <Link
          href="#"
          className="flex items-center px-3 py-2 mx-2 text-white hover:bg-[#216f99]/80"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs sm:text-sm truncate whitespace-nowrap">
              Settings
            </span>
          )}
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center px-3 py-2 mx-2 text-white hover:bg-[#216f99]/80 w-full text-left"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs sm:text-sm truncate whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
