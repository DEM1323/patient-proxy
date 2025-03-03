"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("patient"); // Default role

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Please login first");
          router.push("/login");
        } else {
          setUserName(user.user_metadata.full_name || user.email || "");
          // In a real app, you would fetch the user role from your database
          // For now, we'll just use a default role
        }
      } catch (error) {
        toast.error("Failed to fetch user data");
      } finally {
        setIsLoading(false);
      }
    };
    getUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      const loadingToast = toast.loading("Logging out...");
      await supabase.auth.signOut();
      toast.dismiss(loadingToast);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Patient Proxy</h1>
          <button
            onClick={handleLogout}
            className="bg-white text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 border border-gray-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome, {userName}!</h2>
          <p className="text-gray-600 mb-2">
            You are logged in as:{" "}
            <span className="font-medium capitalize">{userRole}</span>
          </p>
          <p className="text-gray-600">
            This is your secure dashboard where you can manage your healthcare
            proxy settings.
          </p>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* My Profile Card */}
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-medium mb-2">My Profile</h3>
            <p className="text-gray-600 mb-4">
              Manage your personal information and preferences
            </p>
            <Link
              href="/profile"
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              View Profile →
            </Link>
          </div>

          {/* My Proxies Card */}
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-medium mb-2">My Proxies</h3>
            <p className="text-gray-600 mb-4">
              Manage people who can access your healthcare information
            </p>
            <Link
              href="/proxies"
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Manage Proxies →
            </Link>
          </div>

          {/* Healthcare Providers Card */}
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-medium mb-2">Healthcare Providers</h3>
            <p className="text-gray-600 mb-4">
              Connect with your doctors and healthcare providers
            </p>
            <Link
              href="/providers"
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              View Providers →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
