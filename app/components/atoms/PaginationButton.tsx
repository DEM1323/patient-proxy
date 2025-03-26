"use client";

import React from "react";

interface PaginationButtonProps {
  number?: number;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}

export const PaginationButton: React.FC<PaginationButtonProps> = ({
  number,
  icon,
  active = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-md text-xs xs:text-sm sm:text-base ${
        active
          ? "bg-[#015a8b] text-white"
          : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
      }`}
    >
      {number || icon}
    </button>
  );
};
