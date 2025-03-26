"use client";

import React from "react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = "text",
  placeholder,
  required = false,
  value,
  onChange,
  error,
  className,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={error ? "border-red-500" : ""}
      />
    </div>
  );
};
