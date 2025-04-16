"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContentLayout } from "@/app/components/layouts/ContentLayout";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { getProfiles } from "@/app/lib/storage";
import { type PatientProfile } from "@/app/types/patient";
import { Info, Check, MessageCircle, PlayCircle } from "lucide-react";

const CheckboxItem = ({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) => (
  <div className="flex items-start">
    <div
      className={`flex-shrink-0 w-4 h-4 mr-1 border border-gray-500 rounded flex items-center justify-center ${
        checked ? "bg-[#015a8b] border-[#015a8b]" : "bg-white"
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </div>
    <span className="font-semibold">{label}</span>
  </div>
);

export default function SelectPatient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "chat"; // Default to chat mode
  const [profiles, setProfiles] = useState<PatientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<PatientProfile | null>(
    null
  );

  useEffect(() => {
    // Validate mode
    if (!["chat", "simulation"].includes(mode)) {
      router.replace("/patient-interactions");
      return;
    }

    // Load profiles
    const loadProfiles = async () => {
      try {
        setIsLoading(true);
        const profilesObj = await getProfiles();
        const profilesList = Object.values(profilesObj);
        setProfiles(profilesList);
      } catch (error) {
        console.error("Error loading profiles:", error);
        setProfiles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [mode, router]);

  const handleSelectPatient = (profileId: string) => {
    const destination =
      mode === "simulation"
        ? `/patient-interactions/patient-simulation/${profileId}`
        : `/patient-interactions/patient-chat?patientId=${profileId}`;
    router.push(destination);
  };

  const handleInfoClick = (e: React.MouseEvent, profile: PatientProfile) => {
    e.stopPropagation(); // Prevent card click from triggering
    setSelectedProfile(profile);
  };

  const getActionButton = (profile: PatientProfile) => {
    if (mode === "simulation") {
      return (
        <Button
          className="w-full bg-[#015a8b] hover:bg-[#216f99] flex items-center justify-center gap-2"
          onClick={() => handleSelectPatient(profile.id)}
        >
          <PlayCircle className="h-4 w-4" />
          Start Simulation
        </Button>
      );
    }
    return (
      <Button
        className="w-full bg-[#015a8b] hover:bg-[#216f99] flex items-center justify-center gap-2"
        onClick={() => handleSelectPatient(profile.id)}
      >
        <MessageCircle className="h-4 w-4" />
        Start Chat
      </Button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#015a8b] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <ContentLayout
        title={`Select Patient for ${
          mode === "simulation" ? "Simulation" : "Chat"
        }`}
        showSearch={true}
        onSearch={(term) => console.log("Search:", term)}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center p-8 max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              No Patient Profiles Found
            </h3>
            <p className="text-gray-600 mb-6">
              You need to create a patient profile before you can start a{" "}
              {mode === "simulation" ? "simulation" : "chat"}.
            </p>
            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => router.push("/manage-profiles/create")}
                className="bg-[#015a8b] hover:bg-[#216f99] w-full"
              >
                Create a New Patient Profile
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    // Create a sample profile automatically
                    const response = await fetch("/api/ensure-sample-profile", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                    });

                    if (!response.ok) {
                      throw new Error("Failed to create sample profile");
                    }

                    const result = await response.json();

                    if (result.created && result.profile) {
                      // Use the newly created sample profile
                      const sampleId = result.profile.id;
                      // Navigate directly to chat or simulation with this profile
                      const destination =
                        mode === "simulation"
                          ? `/patient-interactions/patient-simulation/${sampleId}`
                          : `/patient-interactions/patient-chat?patientId=${sampleId}`;
                      router.push(destination);
                    } else {
                      // Profiles were found (sample already existed), reload the page
                      window.location.reload();
                    }
                  } catch (error) {
                    console.error("Error creating sample profile:", error);
                    setIsLoading(false);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Use a Sample Patient Profile
              </Button>
              <Button
                onClick={() => router.push("/patient-interactions")}
                variant="ghost"
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </ContentLayout>
    );
  }

  return (
    <>
      <ContentLayout
        title={`Select Patient for ${
          mode === "simulation" ? "Simulation" : "Chat"
        }`}
        showSearch={true}
        onSearch={(term) => console.log("Search:", term)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className="border-[#015a8b] hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => handleSelectPatient(profile.id)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 hover:bg-[#015a8b]/10"
                onClick={(e) => handleInfoClick(e, profile)}
              >
                <Info className="h-5 w-5 text-[#015a8b]" />
              </Button>
              <CardHeader>
                <CardTitle className="text-[#015a8b]">
                  {profile.patientName}
                </CardTitle>
                <CardDescription>
                  Age: {profile.age} | Gender: {profile.gender}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {profile.diagnosis ||
                    profile.history ||
                    "No medical history available"}
                </p>
              </CardContent>
              <CardFooter>{getActionButton(profile)}</CardFooter>
            </Card>
          ))}
        </div>
      </ContentLayout>

      {/* Patient Details Modal */}
      <Dialog
        open={!!selectedProfile}
        onOpenChange={() => setSelectedProfile(null)}
      >
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-6 overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl text-[#015a8b]">
              Patient Profile Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-full max-h-[calc(95vh-120px)]">
            {selectedProfile && (
              <div className="h-full w-full max-w-full overflow-x-auto">
                <table className="h-full w-full border-collapse text-[8px] xs:text-[9px] sm:text-xs md:text-sm min-w-[650px]">
                  <tbody>
                    {/* Patient Basic Info Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                        colSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Patient Name:
                          </strong>{" "}
                          {selectedProfile.patientName || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Age:
                          </strong>{" "}
                          {selectedProfile.age || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Gender:
                          </strong>{" "}
                          {selectedProfile.gender || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                        rowSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Allergies:
                          </strong>{" "}
                          {selectedProfile.allergies || (
                            <span className="text-gray-400">
                              No known allergies
                            </span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Unit:
                          </strong>{" "}
                          {selectedProfile.unit || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Major support:
                          </strong>{" "}
                          {selectedProfile.majorSupport || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Phone:
                          </strong>{" "}
                          {selectedProfile.phone || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-1 sm:mt-2">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Immunizations:
                          </strong>{" "}
                          {selectedProfile.immunizations || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Case Details Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={2}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Case:
                          </strong>{" "}
                          {selectedProfile.case || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diagnosis:
                          </strong>{" "}
                          {selectedProfile.diagnosis || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            History:
                          </strong>{" "}
                          {selectedProfile.history || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Type of operation:
                          </strong>{" "}
                          {selectedProfile.operationType || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Height:
                          </strong>{" "}
                          {selectedProfile.height || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Consultation:
                          </strong>{" "}
                          {selectedProfile.consultation || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Consent obtained:
                          </strong>{" "}
                          {selectedProfile.consentObtained ? "✓ Yes" : "☐ Yes"}
                          {!selectedProfile.consentObtained ? "✓ No" : "☐ No"}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={2}
                      >
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Weight:
                          </strong>{" "}
                          {selectedProfile.weight || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Physician:
                          </strong>{" "}
                          {selectedProfile.physician || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Advanced directives:
                          </strong>{" "}
                          {selectedProfile.advancedDirectives || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diet:
                          </strong>{" "}
                          {selectedProfile.diet || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Fall precautions:
                          </strong>{" "}
                          {selectedProfile.fallPrecautions || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Restraints:
                          </strong>{" "}
                          {selectedProfile.restraints || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-0.5 sm:mt-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Isolation precautions:
                          </strong>{" "}
                          {selectedProfile.isolationPrecautions || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Monitoring, Medication, Respiratory Row */}
                    <tr>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Monitoring:
                          </strong>
                        </div>
                        {selectedProfile.monitoringItems?.length > 0 ? (
                          selectedProfile.monitoringItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No monitoring items
                          </div>
                        )}
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medication:
                          </strong>
                        </div>
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medications:
                          </strong>
                          {selectedProfile.medicationItems &&
                          selectedProfile.medicationItems.length > 0 ? (
                            selectedProfile.medicationItems.map((item) => (
                              <div key={item.id} className="mt-1 sm:mt-2">
                                <CheckboxItem
                                  label={item.title}
                                  checked={item.checked}
                                />
                                {item.details && (
                                  <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                    ({item.details})
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                              No medications
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                        colSpan={3}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Respiratory:
                          </strong>
                        </div>
                        {selectedProfile.respiratoryItems?.length > 0 ? (
                          selectedProfile.respiratoryItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No respiratory items
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Diagnostic Studies, Social History, Activity of Daily Living Row */}
                    <tr>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Diagnostic studies:
                          </strong>
                        </div>
                        {selectedProfile.diagnosticItems?.length > 0 ? (
                          selectedProfile.diagnosticItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No diagnostic studies
                          </div>
                        )}
                      </td>
                      <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Social history:
                          </strong>
                        </div>
                        {selectedProfile.socialHistoryItems?.length > 0 ? (
                          selectedProfile.socialHistoryItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No social history items
                          </div>
                        )}
                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Race/Religion:
                          </strong>{" "}
                          {selectedProfile.raceReligion || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Medication brought from home:
                          </strong>
                        </div>
                        {selectedProfile.medicationFromHomeItems?.length > 0 ? (
                          selectedProfile.medicationFromHomeItems.map(
                            (item) => (
                              <div key={item.id} className="mt-1 sm:mt-2">
                                <CheckboxItem
                                  label={item.title}
                                  checked={item.checked}
                                />
                                {item.details && (
                                  <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                    ({item.details})
                                  </div>
                                )}
                              </div>
                            )
                          )
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-1">
                            No medications from home
                          </div>
                        )}
                      </td>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                        colSpan={3}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Activity of daily living:
                          </strong>
                        </div>
                        {selectedProfile.activityItems?.length > 0 ? (
                          selectedProfile.activityItems.map((item) => (
                            <div key={item.id} className="mt-1 sm:mt-2">
                              <CheckboxItem
                                label={item.title}
                                checked={item.checked}
                              />
                              {item.details && (
                                <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                  ({item.details})
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No activity items
                          </div>
                        )}

                        <div className="mt-2 sm:mt-3">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Discharge planning:
                          </strong>{" "}
                          {selectedProfile.dischargePlanning || (
                            <span className="text-gray-400">Not specified</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Drains Row */}
                    <tr>
                      <td
                        className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                        colSpan={5}
                      >
                        <div className="mb-1">
                          <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                            Drains:
                          </strong>
                        </div>
                        {selectedProfile.drainItems?.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedProfile.drainItems.map((item) => (
                              <div key={item.id} className="mt-1 sm:mt-2">
                                <CheckboxItem
                                  label={item.title}
                                  checked={item.checked}
                                />
                                {item.details && (
                                  <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                                    ({item.details})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                            No drains
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
