"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold mb-4 text-[#015a8b]">
          Welcome to Patient Proxy
        </h1>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          A training platform that enables healthcare students to practice
          clinical communication skills through simulated patient interactions
          powered by large language models.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/login"
            className="bg-[#015a8b] text-white px-6 py-3 rounded-lg hover:bg-[#014a71] transition-colors w-full sm:w-auto text-center"
          >
            Sign In with Google
          </Link>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">
                Customizable Patient Scenarios
              </h3>
              <p className="text-sm text-gray-600">
                Instructors can create varied clinical scenarios for realistic
                training experiences.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">
                AI-Powered Patient Simulation
              </h3>
              <p className="text-sm text-gray-600">
                Practice with realistic patient interactions using advanced
                language models.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <h3 className="font-medium mb-2">Real-time Feedback</h3>
              <p className="text-sm text-gray-600">
                Receive automated insights on communication strengths and areas
                for improvement.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            This project is part of an independent study (IT 478) at UMass
            Boston, supervised by Rosemary Samia.
          </p>
          <p className="mt-2">
            Developed by David Martinez (Technical) and Michael Agbesi (UX/UI
            Design)
          </p>
        </div>
      </div>
    </div>
  );
}
