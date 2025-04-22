"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-4xl font-bold mb-4 text-[#015a8b]">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/patient-profiles"
          className="inline-flex items-center bg-[#015a8b] text-white px-6 py-3 rounded-lg hover:bg-[#014a71] transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
