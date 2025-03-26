"use client";

import React, { useState } from "react";
import { Search, Send } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search...",
  onSearch,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex items-center bg-white rounded-md border border-[#015a8b] overflow-hidden h-12">
      <Search className="ml-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 p-2 text-sm sm:text-base outline-none"
      />
      <button
        onClick={handleSearch}
        className="bg-[#015a8b] h-full px-3 flex items-center justify-center"
      >
        <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </button>
    </div>
  );
};
