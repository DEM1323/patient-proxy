import React from "react";
import { PatientProfile } from "@/app/types/patient";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface ChecklistItem {
  id: number;
  title: string;
  details?: string;
  checked: boolean;
}

interface PatientProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientProfile;
}

// Checkbox item component for the lists
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

export function PatientProfileModal({
  open,
  onOpenChange,
  patient,
}: PatientProfileModalProps) {
  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-6 overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl text-[#015a8b]">
            Patient Profile Details
            {patient.isGlobal && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Default Profile
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[calc(95vh-120px)]">
          <div className="h-full w-full max-w-full overflow-x-auto">
            <table className="h-full w-full border-collapse text-[8px] xs:text-[9px] sm:text-sm min-w-[650px]">
              <tbody>
                {/* Patient Basic Info Row */}
                <tr>
                  <td
                    className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                    colSpan={2}
                  >
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Patient Name:
                      </strong>{" "}
                      {patient.patientName || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Age:
                      </strong>{" "}
                      {patient.age || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Gender:
                      </strong>{" "}
                      {patient.gender || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                  </td>
                  <td
                    className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/3 align-top"
                    rowSpan={2}
                  >
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Allergies:
                      </strong>{" "}
                      {patient.allergies || "No known allergies"}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Unit:
                      </strong>{" "}
                      {patient.unit || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Major support:
                      </strong>{" "}
                      {patient.majorSupport || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Phone:
                      </strong>{" "}
                      {patient.phone || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Immunizations:
                      </strong>{" "}
                      {patient.immunizations || (
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
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Case:
                      </strong>{" "}
                      {patient.case || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Diagnosis:
                      </strong>{" "}
                      {patient.diagnosis || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        History:
                      </strong>{" "}
                      {patient.history || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Type of operation:
                      </strong>{" "}
                      {patient.operationType || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Height:
                      </strong>{" "}
                      {patient.height || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Consultation:
                      </strong>{" "}
                      {patient.consultation || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Consent obtained:
                      </strong>{" "}
                      {patient.consentObtained ? "✓ Yes" : "☐ Yes"}
                      {!patient.consentObtained ? "✓ No" : "☐ No"}
                    </div>
                  </td>
                  <td
                    className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 align-top"
                    colSpan={2}
                  >
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Weight:
                      </strong>{" "}
                      {patient.weight || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Physician:
                      </strong>{" "}
                      {patient.physician || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Advanced directives:
                      </strong>{" "}
                      {patient.advancedDirectives || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Diet:
                      </strong>{" "}
                      {patient.diet || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Fall precautions:
                      </strong>{" "}
                      {patient.fallPrecautions || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Restraints:
                      </strong>{" "}
                      {patient.restraints || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Isolation precautions:
                      </strong>{" "}
                      {patient.isolationPrecautions || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Monitoring, Medication, Respiratory Row */}
                <tr>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Monitoring:
                      </strong>
                    </div>
                    {patient.monitoringItems?.length > 0 ? (
                      patient.monitoringItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No monitoring items
                      </div>
                    )}
                  </td>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Medication:
                      </strong>
                    </div>
                    {patient.medicationItems &&
                    patient.medicationItems.length > 0 ? (
                      patient.medicationItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No medications
                      </div>
                    )}
                  </td>
                  <td
                    className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                    colSpan={3}
                  >
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Respiratory:
                      </strong>
                    </div>
                    {patient.respiratoryItems?.length > 0 ? (
                      patient.respiratoryItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No respiratory items
                      </div>
                    )}
                  </td>
                </tr>

                {/* Diagnostic Studies, Social History, Activity of Daily Living Row */}
                <tr>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Diagnostic studies:
                      </strong>
                    </div>
                    {patient.diagnosticItems?.length > 0 ? (
                      patient.diagnosticItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No diagnostic studies
                      </div>
                    )}
                  </td>
                  <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/5 align-top">
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Social history:
                      </strong>
                    </div>
                    {patient.socialHistoryItems?.length > 0 ? (
                      patient.socialHistoryItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No social history items
                      </div>
                    )}
                    <div className="mt-2 sm:mt-3">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Race/Religion:
                      </strong>{" "}
                      {patient.raceReligion || (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-3">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Medication brought from home:
                      </strong>
                    </div>
                    {patient.medicationFromHomeItems?.length > 0 ? (
                      patient.medicationFromHomeItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm mt-1">
                        No medications from home
                      </div>
                    )}
                  </td>
                  <td
                    className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-3/5 align-top"
                    colSpan={3}
                  >
                    <div className="mb-1">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Activity of daily living:
                      </strong>
                    </div>
                    {patient.activityItems?.length > 0 ? (
                      patient.activityItems.map((item) => (
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No activity items
                      </div>
                    )}

                    <div className="mt-2 sm:mt-3">
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Discharge planning:
                      </strong>{" "}
                      {patient.dischargePlanning || (
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
                      <strong className="text-[9px] xs:text-[10px] sm:text-sm font-bold">
                        Drains:
                      </strong>
                    </div>
                    {patient.drainItems?.length > 0 ? (
                      <div className="flex flex-wrap">
                        {patient.drainItems.map((item) => (
                          <div
                            key={item.id}
                            className="mt-1 sm:mt-2 mr-4 flex-shrink-0"
                          >
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
                      <div className="text-gray-400 text-[9px] xs:text-[10px] sm:text-sm">
                        No drain items
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
