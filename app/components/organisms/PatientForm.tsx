"use client";

import type React from "react";
import { useState } from "react";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";
import {
  type PatientProfile,
  type ChecklistItem,
  emptyPatientProfile,
} from "@/app/types/patient";

interface PatientFormProps {
  onSubmit: (data: PatientProfile) => void;
  initialData?: PatientProfile;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  onSubmit,
  initialData = emptyPatientProfile,
}) => {
  // Ensure medicationFromHomeItems exists in the initial profile
  console.log("[FORM] Initializing with ID:", initialData.id);
  const initialProfile = {
    ...initialData,
    id: initialData.id || "", // Explicitly preserve the ID
    medicationFromHomeItems: initialData.medicationFromHomeItems || [],
    monitoringItems: initialData.monitoringItems || [],
    medicationItems: initialData.medicationItems || [],
    respiratoryItems: initialData.respiratoryItems || [],
    diagnosticItems: initialData.diagnosticItems || [],
    socialHistoryItems: initialData.socialHistoryItems || [],
    activityItems: initialData.activityItems || [],
    drainItems: initialData.drainItems || [],
  } as PatientProfile;

  // State for the patient profile
  const [profile, setProfile] = useState<PatientProfile>(initialProfile);
  const isEditMode = !!initialData.id;

  console.log("PatientForm using profile ID:", initialData.id, profile.id);

  // Generic function to update a simple field
  const updateField = (
    field: keyof PatientProfile,
    value: string | boolean | number
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // Generic function to add an item to any section
  const addItem = (section: keyof PatientProfile) => {
    // Initialize the array if it doesn't exist yet
    if (!profile[section]) {
      setProfile((prev) => ({
        ...prev,
        [section]: [],
      }));
      return;
    }

    const items = profile[section] as ChecklistItem[];
    const newId =
      items.length > 0 ? Math.max(...items.map((item) => item.id)) + 1 : 1;
    const newItem: ChecklistItem = {
      id: newId,
      title: "",
      details: "",
      checked: false,
    };

    setProfile((prev) => ({
      ...prev,
      [section]: [...items, newItem],
    }));
  };

  // Generic function to remove an item from any section
  const removeItem = (section: keyof PatientProfile, id: number) => {
    const items = profile[section] as ChecklistItem[];

    setProfile((prev) => ({
      ...prev,
      [section]: items.filter((item) => item.id !== id),
    }));
  };

  // Generic function to update an item in any section
  const updateItem = (
    section: keyof PatientProfile,
    id: number,
    field: keyof ChecklistItem,
    value: string | boolean | number
  ) => {
    const items = profile[section] as ChecklistItem[];

    setProfile((prev) => ({
      ...prev,
      [section]: items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[FORM] Form submission, initial ID:", initialData.id);
    console.log("[FORM] Current profile ID:", profile.id);

    // Always prioritize the original ID from initialData
    const finalId = initialData.id || profile.id;
    console.log("[FORM] Final ID for submission:", finalId);

    // Create a proper profile with ID preserved
    const submittedProfile = {
      ...profile,
      id: finalId, // Explicitly use the original ID
    } as PatientProfile;

    onSubmit(submittedProfile);
  };

  const handleButtonClick = () => {
    console.log("[FORM] Button click, initial ID:", initialData.id);
    console.log("[FORM] Current profile ID:", profile.id);

    // Always prioritize the original ID from initialData
    const finalId = initialData.id || profile.id;
    console.log("[FORM] Final ID for submission:", finalId);

    // Create a proper profile with ID preserved
    const submittedProfile = {
      ...profile,
      id: finalId, // Explicitly use the original ID
    } as PatientProfile;

    onSubmit(submittedProfile);
  };

  // Render a checklist section
  const renderChecklistSection = (
    title: string,
    section: keyof PatientProfile
  ) => {
    const items = profile[section] as ChecklistItem[];

    return (
      <div className="border border-[#97a8b5] p-4 mb-4 rounded-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">{title}</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => addItem(section)}
            className="h-7 px-2"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Item
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No items added yet</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded-md p-2 bg-gray-50">
                <div className="flex items-start mb-2">
                  <Checkbox
                    id={`${section}-${item.id}-checked`}
                    checked={item.checked}
                    onCheckedChange={(checked) =>
                      updateItem(section, item.id, "checked", !!checked)
                    }
                    className="mt-1 mr-2"
                  />
                  <div className="flex-1">
                    <Input
                      value={item.title}
                      onChange={(e) =>
                        updateItem(section, item.id, "title", e.target.value)
                      }
                      placeholder="Item title"
                      className="mb-2 bg-white"
                    />
                    <Textarea
                      value={item.details || ""}
                      onChange={(e) =>
                        updateItem(section, item.id, "details", e.target.value)
                      }
                      placeholder="Additional details (optional)"
                      className="min-h-[60px] bg-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(section, item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 bg-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="border border-[#97a8b5] flex-1 overflow-auto">
        <form className="w-full" onSubmit={handleSubmit}>
          <table className="w-full border-collapse text-[8px] xs:text-[9px] sm:text-xs md:text-sm min-w-[650px]">
            <tbody>
              {/* Patient Basic Info Row */}
              <tr>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                  colSpan={2}
                >
                  <div className="mb-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Patient Name:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Enter patient name"
                      value={profile.patientName}
                      onChange={(e) =>
                        updateField("patientName", e.target.value)
                      }
                    />
                  </div>
                </td>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                  <div className="mb-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Age:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      type="number"
                      placeholder="Age"
                      value={profile.age || ""}
                      onChange={(e) =>
                        updateField(
                          "age",
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : null
                        )
                      }
                    />
                  </div>
                </td>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                  <div className="mb-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Gender:
                    </Label>
                    <select
                      className="w-full h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 border border-input rounded-md bg-white"
                      value={profile.gender}
                      onChange={(e) => updateField("gender", e.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </td>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                  rowSpan={2}
                >
                  <div className="mb-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Allergies:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="List allergies or 'None'"
                      value={profile.allergies}
                      onChange={(e) => updateField("allergies", e.target.value)}
                    />
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Unit:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Unit"
                      value={profile.unit}
                      onChange={(e) => updateField("unit", e.target.value)}
                    />
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Major support:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Major support"
                      value={profile.majorSupport}
                      onChange={(e) =>
                        updateField("majorSupport", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Phone:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Phone number"
                      value={profile.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                    />
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Immunizations:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Immunization details"
                      value={profile.immunizations}
                      onChange={(e) =>
                        updateField("immunizations", e.target.value)
                      }
                    />
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
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Case:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Case details"
                      value={profile.case}
                      onChange={(e) => updateField("case", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Diagnosis:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Diagnosis"
                      value={profile.diagnosis}
                      onChange={(e) => updateField("diagnosis", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      History:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Patient history"
                      value={profile.history}
                      onChange={(e) => updateField("history", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Type of operation:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Operation type"
                      value={profile.operationType}
                      onChange={(e) =>
                        updateField("operationType", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Height:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Height (inches/meters)"
                      value={profile.height}
                      onChange={(e) => updateField("height", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Consultation:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Consultation details"
                      value={profile.consultation}
                      onChange={(e) =>
                        updateField("consultation", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Consent obtained:
                    </Label>
                    <div className="flex items-center mt-0.5 gap-2">
                      <Label className="flex items-center text-[8px] xs:text-[9px] sm:text-xs md:text-sm">
                        <Checkbox
                          className="mr-1 h-3 w-3 sm:h-4 sm:w-4"
                          checked={profile.consentObtained === true}
                          onCheckedChange={() =>
                            updateField("consentObtained", true)
                          }
                        />
                        Yes
                      </Label>
                      <Label className="flex items-center text-[8px] xs:text-[9px] sm:text-xs md:text-sm">
                        <Checkbox
                          className="mr-1 h-3 w-3 sm:h-4 sm:w-4"
                          checked={profile.consentObtained === false}
                          onCheckedChange={() =>
                            updateField("consentObtained", false)
                          }
                        />
                        No
                      </Label>
                    </div>
                  </div>
                </td>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                  colSpan={2}
                >
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Weight:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Weight (pounds/kg)"
                      value={profile.weight}
                      onChange={(e) => updateField("weight", e.target.value)}
                    />
                  </div>
                  <div className="mt-2 sm:mt-4">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Physician:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Physician name"
                      value={profile.physician}
                      onChange={(e) => updateField("physician", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Advanced directives:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Advanced directives"
                      value={profile.advancedDirectives}
                      onChange={(e) =>
                        updateField("advancedDirectives", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Diet:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Diet instructions"
                      value={profile.diet}
                      onChange={(e) => updateField("diet", e.target.value)}
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Fall precautions:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Fall precautions"
                      value={profile.fallPrecautions}
                      onChange={(e) =>
                        updateField("fallPrecautions", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Restraints:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Restraints"
                      value={profile.restraints}
                      onChange={(e) =>
                        updateField("restraints", e.target.value)
                      }
                    />
                  </div>
                  <div className="mt-0.5 sm:mt-1">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Isolation precautions:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Isolation precautions"
                      value={profile.isolationPrecautions}
                      onChange={(e) =>
                        updateField("isolationPrecautions", e.target.value)
                      }
                    />
                  </div>
                </td>
              </tr>

              {/* Monitoring, Medication, Respiratory Row */}
              <tr>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                  {/* Monitoring Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Monitoring:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("monitoringItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add monitoring item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {profile.monitoringItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`monitoring-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "monitoringItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Monitoring item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "monitoringItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "monitoringItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeItem("monitoringItems", item.id)}
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </td>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                  {/* Medication Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Medication:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("medicationItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add medication item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {(profile.medicationItems || []).map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`medication-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "medicationItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Medication item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "medicationItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "medicationItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeItem("medicationItems", item.id)}
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </td>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                  colSpan={3}
                >
                  {/* Respiratory Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Respiratory:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("respiratoryItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add respiratory item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {profile.respiratoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`respiratory-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "respiratoryItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Respiratory item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "respiratoryItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "respiratoryItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            removeItem("respiratoryItems", item.id)
                          }
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </td>
              </tr>

              {/* Diagnostic Studies, Social History, Activity of Daily Living Row */}
              <tr>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                  {/* Diagnostic Studies Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Diagnostic Studies:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("diagnosticItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add diagnostic item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {profile.diagnosticItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`diagnostic-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "diagnosticItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Diagnostic item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "diagnosticItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "diagnosticItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeItem("diagnosticItems", item.id)}
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </td>
                <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                  {/* Social History Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Social History:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("socialHistoryItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add social history item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {profile.socialHistoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`social-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "socialHistoryItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Social history item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "socialHistoryItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "socialHistoryItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() =>
                            removeItem("socialHistoryItems", item.id)
                          }
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 sm:mt-3">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Race/religion:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Race/religion"
                      value={profile.raceReligion}
                      onChange={(e) =>
                        updateField("raceReligion", e.target.value)
                      }
                    />
                  </div>

                  <div className="mt-3 sm:mt-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                        Medication brought from home:
                      </Label>
                      <Button
                        type="button"
                        onClick={() => addItem("medicationFromHomeItems")}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                        title="Add medication from home"
                      >
                        <Plus className="h-4 w-4 text-white" />
                      </Button>
                    </div>

                    {(profile.medicationFromHomeItems || []).map((item) => (
                      <div
                        key={item.id}
                        className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-start">
                          <Checkbox
                            className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                            id={`med-home-${item.id}`}
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              updateItem(
                                "medicationFromHomeItems",
                                item.id,
                                "checked",
                                checked === true
                              )
                            }
                          />
                          <div className="flex-1">
                            <Input
                              className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                              placeholder="Medication name"
                              value={item.title}
                              onChange={(e) =>
                                updateItem(
                                  "medicationFromHomeItems",
                                  item.id,
                                  "title",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                              placeholder="Dosage and instructions"
                              value={item.details || ""}
                              onChange={(e) =>
                                updateItem(
                                  "medicationFromHomeItems",
                                  item.id,
                                  "details",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() =>
                              removeItem("medicationFromHomeItems", item.id)
                            }
                            className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                  colSpan={3}
                >
                  {/* Activity of Daily Living Section */}
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Activity of Daily Living:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("activityItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add activity item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  {profile.activityItems.map((item) => (
                    <div
                      key={item.id}
                      className="mt-1 sm:mt-2 border-b border-[#97a8b5]/30 pb-1 sm:pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start">
                        <Checkbox
                          className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                          id={`activity-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={(checked) =>
                            updateItem(
                              "activityItems",
                              item.id,
                              "checked",
                              checked === true
                            )
                          }
                        />
                        <div className="flex-1">
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                            placeholder="Activity item title"
                            value={item.title}
                            onChange={(e) =>
                              updateItem(
                                "activityItems",
                                item.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                          <Input
                            className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                            placeholder="Optional details"
                            value={item.details || ""}
                            onChange={(e) =>
                              updateItem(
                                "activityItems",
                                item.id,
                                "details",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => removeItem("activityItems", item.id)}
                          className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 sm:mt-3">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Discharge planning:
                    </Label>
                    <Input
                      className="h-6 sm:h-8 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-0.5 bg-white"
                      placeholder="Discharge planning"
                      value={profile.dischargePlanning}
                      onChange={(e) =>
                        updateField("dischargePlanning", e.target.value)
                      }
                    />
                  </div>
                </td>
              </tr>

              {/* Drains Row */}
              <tr>
                <td
                  className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                  colSpan={5}
                >
                  <div className="flex justify-between items-center">
                    <Label className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                      Drains:
                    </Label>
                    <Button
                      type="button"
                      onClick={() => addItem("drainItems")}
                      className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-[#015a8b] hover:bg-[#216f99] rounded-full"
                      title="Add drain item"
                    >
                      <Plus className="h-4 w-4 text-white" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                    {profile.drainItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-[#97a8b5]/30 p-1 sm:p-2 rounded"
                      >
                        <div className="flex items-start">
                          <Checkbox
                            className="mt-1 mr-1 sm:mt-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4"
                            id={`drain-${item.id}`}
                            checked={item.checked}
                            onCheckedChange={(checked) =>
                              updateItem(
                                "drainItems",
                                item.id,
                                "checked",
                                checked === true
                              )
                            }
                          />
                          <div className="flex-1">
                            <Input
                              className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm bg-white"
                              placeholder="Drain item title"
                              value={item.title}
                              onChange={(e) =>
                                updateItem(
                                  "drainItems",
                                  item.id,
                                  "title",
                                  e.target.value
                                )
                              }
                            />
                            <Input
                              className="h-6 sm:h-7 text-[8px] xs:text-[9px] sm:text-xs md:text-sm mt-1 bg-white"
                              placeholder="Optional details"
                              value={item.details || ""}
                              onChange={(e) =>
                                updateItem(
                                  "drainItems",
                                  item.id,
                                  "details",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeItem("drainItems", item.id)}
                            className="ml-1 h-5 w-5 sm:h-6 sm:w-6 p-0.5 bg-red-500 hover:bg-red-600 rounded-full"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </div>

      <div className="mt-4 flex justify-end sticky bottom-0 bg-white py-2">
        <Button
          type="button"
          onClick={handleButtonClick}
          className="bg-[#015a8b] hover:bg-[#216f99] text-white"
        >
          {isEditMode ? "Update Patient Profile" : "Create Patient Profile"}
        </Button>
      </div>
    </div>
  );
};
