"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientSimulationPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the selection page with simulation mode
    router.push("/patient-interactions/select-patient?mode=simulation");
  }, [router]);

  // Display a loading state while redirect happens
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to simulations...</p>
      </div>
    </div>
  );
}
