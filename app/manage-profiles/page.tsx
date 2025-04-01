"use client";

import { UserPlus, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";

export default function ManageProfiles() {
  // Add action buttons for the ContentLayout
  // const Actions = <></>;

  return (
    <ContentLayout
      title="Manage Patient Profiles"
      onSearch={(term) => console.log("Search:", term)}
    >
      {/* Menu Options */}
      <div className="flex items-center justify-center h-full w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Create New Profile Card */}
          <Card className="border-[#015a8b] hover:shadow-md transition-shadow">
            <CardHeader className="bg-[#015a8b]/10 border-b border-[#015a8b]/20">
              <CardTitle className="text-[#015a8b] flex items-center">
                <UserPlus className="mr-2 h-5 w-5" />
                Create New Profile
              </CardTitle>
              <CardDescription>Add a new patient to the system</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600">
                Create a comprehensive new patient profile with medical history,
                medications, and care instructions.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/manage-profiles/create" className="w-full">
                <Button className="w-full bg-[#015a8b] hover:bg-[#216f99]">
                  Create New Profile
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Edit Existing Profile Card */}
          <Card className="border-[#015a8b] hover:shadow-md transition-shadow">
            <CardHeader className="bg-[#015a8b]/10 border-b border-[#015a8b]/20">
              <CardTitle className="text-[#015a8b] flex items-center">
                <Edit className="mr-2 h-5 w-5" />
                Edit Existing Profile
              </CardTitle>
              <CardDescription>Modify patient information</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600">
                Update information for existing patients, including medical
                details, medications, and care plans.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/manage-profiles/edit" className="w-full">
                <Button className="w-full bg-[#015a8b] hover:bg-[#216f99]">
                  Select Patient to Edit
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}
