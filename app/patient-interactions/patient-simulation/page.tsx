"use client";

import Link from "next/link";
import { Construction } from "lucide-react";

export default function PatientSimulationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <Construction className="h-16 w-16 text-[#015a8b]" />
        </div>

        <h1 className="text-3xl font-bold mb-4 text-[#015a8b]">
          Patient Simulation - Coming Soon
        </h1>

        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          We're currently building our patient simulation feature. This will
          allow healthcare students to practice their clinical communication
          skills through AI-powered patient interactions.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <p className="text-amber-800 font-medium">
            This feature is under active development and will be available soon.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/patient-interactions"
            className="bg-[#015a8b] text-white px-6 py-3 rounded-lg hover:bg-[#014a71] transition-colors w-full sm:w-auto text-center"
          >
            Back to Patient Interactions
          </Link>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Planned Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Realistic Patient Personas</h3>
              <p className="text-sm text-gray-600">
                Interact with diverse patient profiles with unique medical
                histories and personalities.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Varied Clinical Scenarios</h3>
              <p className="text-sm text-gray-600">
                Practice different medical situations from routine check-ups to
                complex cases.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Performance Analytics</h3>
              <p className="text-sm text-gray-600">
                Receive detailed feedback on your communication effectiveness
                and clinical approach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
