"use client";

import {
  type PatientProfile,
  samplePatientProfile,
  type ChecklistItem,
} from "@/app/types/patient";
import { Check } from "lucide-react";

// Helper component for checkbox items
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

interface PatientCardProps {
  profile?: PatientProfile;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  profile = samplePatientProfile,
}) => {
  return (
    <div className="h-full w-full max-w-full overflow-x-auto">
      <table className="h-full w-full border-collapse text-[8px] xs:text-[9px] sm:text-xs md:text-sm min-w-[650px]">
        <tbody>
          {/* Global Profile Badge - only shown for global profiles */}
          {profile.isGlobal && (
            <tr>
              <td
                className="border border-[#97a8b5] bg-[#015a8b]/10 p-1 text-center"
                colSpan={5}
              >
                <div className="inline-flex items-center rounded-full bg-[#015a8b] px-2 py-0.5 text-[8px] xs:text-[9px] sm:text-[10px] md:text-xs font-medium text-white">
                  Default Profile - Read Only
                </div>
              </td>
            </tr>
          )}

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
                {profile.patientName}
              </div>
            </td>
            <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
              <div className="mb-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Age:
                </strong>{" "}
                {profile.age}
              </div>
            </td>
            <td className="border border-[#97a8b5] bg-[#97a8b5]/30 p-1 sm:p-2 w-1/6 align-top">
              <div className="mb-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Gender:
                </strong>{" "}
                {profile.gender}
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
                {profile.allergies}
              </div>
              <div className="mt-1 sm:mt-2">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Unit:
                </strong>{" "}
                {profile.unit}
              </div>
              <div className="mt-1 sm:mt-2">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Major support:
                </strong>{" "}
                {profile.majorSupport}
              </div>
              <div className="mt-1 sm:mt-2">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Phone:
                </strong>{" "}
                {profile.phone}
              </div>
              <div className="mt-1 sm:mt-2">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Immunizations:
                </strong>{" "}
                {profile.immunizations}
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
                {profile.case}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Diagnosis:
                </strong>{" "}
                {profile.diagnosis}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  History:
                </strong>{" "}
                {profile.history}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Type of operation:
                </strong>{" "}
                {profile.operationType}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Height:
                </strong>{" "}
                {profile.height}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Consultation:
                </strong>{" "}
                {profile.consultation}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Consent obtained:
                </strong>{" "}
                {profile.consentObtained ? "✓ Yes" : "☐ Yes"}{" "}
                {!profile.consentObtained ? "✓ No" : "☐ No"}
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
                {profile.weight}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Physician:
                </strong>{" "}
                {profile.physician}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Advanced directives:
                </strong>{" "}
                {profile.advancedDirectives}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Diet:
                </strong>{" "}
                {profile.diet}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Fall precautions:
                </strong>{" "}
                {profile.fallPrecautions}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Restraints:
                </strong>{" "}
                {profile.restraints}
              </div>
              <div className="mt-0.5 sm:mt-1">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Isolation precautions:
                </strong>{" "}
                {profile.isolationPrecautions}
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
              {(profile.monitoringItems || []).length > 0 ? (
                (profile.monitoringItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
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
              {(profile.medicationItems || []).length > 0 ? (
                (profile.medicationItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details &&
                      item.details.split("\n").map((line, i) => (
                        <div
                          key={i}
                          className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700"
                        >
                          ({line})
                        </div>
                      ))}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                  No medications
                </div>
              )}
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
              {(profile.respiratoryItems || []).length > 0 ? (
                (profile.respiratoryItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
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
              {(profile.diagnosticItems || []).length > 0 ? (
                (profile.diagnosticItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
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
              {(profile.socialHistoryItems || []).length > 0 ? (
                (profile.socialHistoryItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                  No social history items
                </div>
              )}
              <div className="mt-2 sm:mt-3">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Race/Religion:
                </strong>{" "}
                {profile.raceReligion || (
                  <span className="text-gray-500">Not specified</span>
                )}
              </div>
              <div className="mt-2 sm:mt-3">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Medication brought from home:
                </strong>
              </div>
              {(profile.medicationFromHomeItems || []).length > 0 ? (
                (profile.medicationFromHomeItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm mt-1">
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
              {(profile.activityItems || []).length > 0 ? (
                (profile.activityItems || []).map((item) => (
                  <div key={item.id} className="mt-1 sm:mt-2">
                    <CheckboxItem label={item.title} checked={item.checked} />
                    {item.details && (
                      <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                        ({item.details})
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                  No activity items
                </div>
              )}

              <div className="mt-2 sm:mt-3">
                <strong className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm font-bold">
                  Discharge planning:
                </strong>{" "}
                {profile.dischargePlanning || (
                  <span className="text-gray-500">Not specified</span>
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
              {(profile.drainItems || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {(profile.drainItems || []).map((item) => (
                    <div key={item.id} className="mt-1 sm:mt-2">
                      <CheckboxItem label={item.title} checked={item.checked} />
                      {item.details && (
                        <div className="mt-0.5 sm:mt-1 ml-5 font-normal text-gray-700">
                          ({item.details})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                  No drains
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
