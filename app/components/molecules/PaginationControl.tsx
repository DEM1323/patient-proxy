"use client";

import React from "react";

// First, let's define the PaginationButton component
interface PaginationButtonProps {
  number?: number;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
}

const PaginationButton: React.FC<PaginationButtonProps> = ({
  number,
  icon,
  active = false,
  onClick,
}) => {
  return (
    <button
      className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-[#015a8b] rounded text-sm sm:text-base ${
        active ? "bg-[#015a8b] text-white" : "bg-white text-[#015a8b]"
      }`}
      onClick={onClick}
    >
      {icon || number}
    </button>
  );
};

// Now, let's create the PaginationControl component that uses PaginationButton
interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex justify-center gap-0.5 xs:gap-1 sm:gap-2 w-full mt-4">
      <PaginationButton
        icon="<"
        active={false}
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
      />

      {Array.from({ length: totalPages }).map((_, i) => (
        <PaginationButton
          key={i}
          number={i + 1}
          active={currentPage === i + 1}
          onClick={() => onPageChange(i + 1)}
        />
      ))}

      <PaginationButton
        icon=">"
        active={false}
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
      />
    </div>
  );
};
