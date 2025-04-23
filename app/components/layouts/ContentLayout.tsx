"use client";

import React, { ReactNode } from "react";
import { SearchBar } from "@/app/components/molecules/SearchBar";

interface ContentLayoutProps {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  showSearch?: boolean;
  onSearch?: (searchTerm: string) => void;
  backgroundColor?: string;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  title,
  actions,
  showSearch = true,
  onSearch,
  backgroundColor = "bg-white",
}) => {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white p-4 flex-shrink-0 z-10">
          <SearchBar
            placeholder="Search patient profiles..."
            onSearch={onSearch}
          />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 p-4 bg-white flex flex-col overflow-hidden">
        <div
          className={`h-full p-4 rounded-md border border-[#015a8b] flex flex-col overflow-auto ${backgroundColor}`}
        >
          {/* Title and Actions */}
          {(title || actions) && (
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              {title &&
                (typeof title === "string" ? (
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {title}
                  </h1>
                ) : (
                  title
                ))}
              {actions && <div className="flex space-x-2">{actions}</div>}
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
