"use client";

import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to connect to Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Patient Proxy</h1>
          <p className="text-gray-600">
            Sign in to manage your healthcare proxy settings
          </p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className={`w-full bg-white text-gray-800 px-6 py-3 rounded-lg shadow-sm hover:shadow-md flex items-center justify-center gap-2 border border-gray-300 mb-4 ${
            isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
        >
          <img src="/google.svg" alt="Google" className="w-5 h-5" />
          {isLoading ? "Connecting..." : "Sign in with Google"}
        </button>

        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-blue-500 hover:text-blue-700">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-500 hover:text-blue-700">
              Privacy Policy
            </Link>
          </p>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-blue-500 hover:text-blue-700">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
