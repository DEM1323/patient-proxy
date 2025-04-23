"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import toast from "react-hot-toast";
import { useAuth } from "@/app/contexts/AuthContext";
import { supabase } from "@/app/lib/supabase";

type BugSeverity = "low" | "medium" | "high" | "critical";

export default function ReportBugPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast.error("You need to be logged in to report bugs");
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-check authentication
    if (!isAuthenticated || !user) {
      toast.error(
        "You must be logged in to report a bug. Please sign in and try again."
      );
      router.push("/login");
      return;
    }

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting bug report directly to Supabase");

      // Submit bug report directly to Supabase
      const { data, error } = await supabase
        .from("bug_reports")
        .insert([
          {
            user_id: user.id,
            title,
            description,
            steps_to_reproduce: stepsToReproduce || null,
            severity,
            status: "new",
          },
        ])
        .select();

      if (error) {
        console.error("Error submitting bug report to Supabase:", error);

        if (
          error.code === "42501" ||
          error.message.includes("permission denied")
        ) {
          toast.error("Authorization error. Please try logging in again.");
          router.push("/login");
        } else {
          toast.error(`Failed to submit bug report: ${error.message}`);
        }
      } else {
        console.log("Bug report submitted successfully:", data);
        toast.success("Bug report submitted successfully!");

        // Reset form
        setTitle("");
        setDescription("");
        setStepsToReproduce("");
        setSeverity("medium");
      }
    } catch (error: any) {
      console.error("Unexpected error submitting bug report:", error);
      toast.error(
        `An unexpected error occurred: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If still loading auth state, show loading spinner
  if (isLoading) {
    return (
      <ContentLayout title="Report a Bug" showSearch={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
        </div>
      </ContentLayout>
    );
  }

  // If not authenticated, don't render the form (useEffect will handle redirect)
  if (!isAuthenticated) {
    return (
      <ContentLayout title="Report a Bug" showSearch={false}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p>
            You need to be logged in to report bugs. Redirecting to login...
          </p>
        </div>
      </ContentLayout>
    );
  }

  // If authenticated, render the form
  return (
    <ContentLayout title="Report a Bug" showSearch={false}>
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2 items-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-amber-800 font-medium">
              Found a bug or issue? Help us improve by submitting a report.
            </p>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-medium">
                Bug Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the bug and its impact"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stepsToReproduce" className="font-medium">
                Steps to Reproduce
              </Label>
              <Textarea
                id="stepsToReproduce"
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder="1. Go to...\n2. Click on...\n3. Observe that..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity" className="font-medium">
                Severity
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {(["low", "medium", "high", "critical"] as BugSeverity[]).map(
                  (level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={severity === level ? "default" : "outline"}
                      className={`
                      ${
                        severity === level
                          ? "bg-[#015a8b] text-white"
                          : "text-gray-700"
                      } 
                      capitalize
                    `}
                      onClick={() => setSeverity(level)}
                    >
                      {level}
                    </Button>
                  )
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#015a8b] hover:bg-[#014a71]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </form>
        </div>
      </div>
    </ContentLayout>
  );
}
