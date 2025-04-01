"use client";

import { Target, MessageCircle } from "lucide-react";
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

export default function PatientInteractions() {
  return (
    <ContentLayout title="Patient Interactions" showSearch={false}>
      {/* Menu Options */}
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Patient Simulation Card */}
          <Card className="border-[#015a8b] hover:shadow-md transition-shadow min-h-[400px] max-h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-[#015a8b] flex items-center justify-center text-2xl">
                <Target className="mr-2 h-7 w-7" />
                Patient Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left flex-grow">
              <p className="text-sm text-gray-600">
                A Simulation takes the experience one step further. In this
                scenario, you'll interact with the patient in a specific,
                detailed situation where you need to achieve certain goals. It's
                like role-playing with clear objectives, designed to help you
                hone your skills. During the simulation, you'll receive detailed
                feedback on how well you perform based on the goals of the
                interaction.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/patient-interactions/select-patient?mode=simulation">
                <Button className="bg-[#015a8b] hover:bg-[#216f99]">
                  Start Patient Simulation
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Chat with a Patient Card */}
          <Card className="border-[#015a8b] hover:shadow-md transition-shadow min-h-[400px] max-h-[500px] flex flex-col">
            <CardHeader>
              <CardTitle className="text-[#015a8b] flex items-center justify-center text-2xl">
                <MessageCircle className="mr-2 h-7 w-7" />
                Chat with a Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="text-left flex-grow">
              <p className="text-sm text-gray-600">
                When you engage in a Chat with a Patient, you'll interact as if
                you're having a real conversation. The goal here is to respond
                to basic queries or support needs, just like you would in a
                real-world scenario. You'll be helping a patient by answering
                their questions or guiding them through their medical or
                health-related concerns.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/patient-interactions/select-patient?mode=chat">
                <Button className="bg-[#015a8b] hover:bg-[#216f99]">
                  Start Patient Chat
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
        <p className="text-md text-gray-600 pt-4 font-bold">
          Chatbot simulations and patient interactions are not saved and will
          clear once you exit the chat.
        </p>
      </div>
    </ContentLayout>
  );
}
