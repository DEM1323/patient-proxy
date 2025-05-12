import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Info } from "lucide-react";

export interface PatientConfigOptions {
  emotion: string;
  healthLiteracy: string;
}

export interface PatientConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: PatientConfigOptions) => void;
  initialOptions: PatientConfigOptions;
  patientName?: string;
}

export function PatientConfigModal({
  isOpen,
  onClose,
  onSave,
  initialOptions,
  patientName = "Patient",
}: PatientConfigModalProps) {
  const [options, setOptions] = useState<PatientConfigOptions>(initialOptions);

  // Available emotion options
  const emotionOptions = [
    "Calm",
    "Anxious",
    "Confused",
    "Angry",
    "Sad",
    "Frustrated",
    "Worried",
    "In Pain",
    "Hopeful",
  ];

  // Health literacy levels
  const healthLiteracyOptions = [
    { value: "1", label: "1 - Very Low (minimal medical knowledge)" },
    { value: "2", label: "2 - Low (basic understanding)" },
    { value: "3", label: "3 - Moderate (average knowledge)" },
    { value: "4", label: "4 - High (good understanding)" },
    { value: "5", label: "5 - Very High (excellent medical knowledge)" },
  ];

  const handleSave = () => {
    onSave(options);
    onClose();
  };

  const handleChange = (field: keyof PatientConfigOptions, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure {patientName}'s Behavior</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="emotion" className="text-right text-sm font-medium">
              Emotional State
            </label>
            <select
              id="emotion"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              value={options.emotion}
              onChange={(e) => handleChange("emotion", e.target.value)}
            >
              {emotionOptions.map((emotion) => (
                <option key={emotion} value={emotion}>
                  {emotion}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="healthLiteracy"
              className="text-right text-sm font-medium"
            >
              Health Literacy
            </label>
            <select
              id="healthLiteracy"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              value={options.healthLiteracy}
              onChange={(e) => handleChange("healthLiteracy", e.target.value)}
            >
              {healthLiteracyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
