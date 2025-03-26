import { Search, Send, UserPlus, Edit } from "lucide-react";
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

export default function ManageProfiles() {
  return (
    <>
      {/* Search Bar */}
      <div className="bg-white p-4">
        <div className="flex items-center bg-white rounded-md border border-[#015a8b] overflow-hidden h-12">
          <Search className="ml-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 p-2 text-sm sm:text-base outline-none"
          />
          <button className="bg-[#015a8b] h-full px-3 flex items-center justify-center">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 bg-white max-h-full">
        <div className="bg-white p-4 rounded-md border border-[#015a8b] h-full flex flex-col">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6">
            Manage Patient Profiles
          </h1>

          {/* Menu Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
            {/* Create New Profile Card */}
            <Card className="border-[#015a8b] hover:shadow-md transition-shadow">
              <CardHeader className="bg-[#015a8b]/10 border-b border-[#015a8b]/20">
                <CardTitle className="text-[#015a8b] flex items-center">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Create New Profile
                </CardTitle>
                <CardDescription>
                  Add a new patient to the system
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600">
                  Create a comprehensive new patient profile with medical
                  history, medications, and care instructions.
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
      </div>
    </>
  );
}
