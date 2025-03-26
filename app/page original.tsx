import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4 text-center">Patient Proxy</h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl">
        Simulate patient interactions as a nursing student or healthcare
        provider
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/login"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-center"
        >
          Sign In
        </Link>
        <Link
          href="/about"
          className="bg-white text-blue-500 border border-blue-500 px-6 py-3 rounded-lg hover:bg-blue-50 text-center"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}
