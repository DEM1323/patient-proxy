import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center p-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold mb-8 text-center">
          About Patient Proxy
        </h1>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-lg mb-4">
            Patient Proxy is an innovative training platform designed to help
            healthcare students develop and refine their clinical communication
            skills through simulated patient interactions. Using advanced
            language models, students can practice patient conversations in a
            safe, customizable environment while receiving detailed feedback on
            their performance.
          </p>
          <p className="text-lg mb-4">
            Our platform empowers healthcare students to practice and improve
            their patient communication skills through realistic simulated
            interactions, helping them become more confident and competent
            healthcare providers.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-lg">
            <li>Create an account using Google Sign-In</li>
            <li>Select a patient scenario and role</li>
            <li>Practice patient interactions with detailed feedback</li>
          </ol>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Security & Privacy</h2>
          <p className="text-lg">
            Patient Proxy is a prototype application that aims to demonstrate
            secure and private handling of data. While we implement basic
            security measures, this is currently a proof-of-concept and should
            not be used with real patient data or sensitive healthcare
            information.
          </p>
        </div>

        <div className="flex justify-center mt-8">
          <Link
            href="/"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 mr-4"
          >
            Back to Home
          </Link>
          <Link
            href="/login"
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
