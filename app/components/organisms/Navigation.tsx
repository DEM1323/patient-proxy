"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Settings, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SidebarLink } from "@/app/components/atoms/SidebarLink";

interface NavigationProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  collapsed,
  onToggle,
  onLogout,
}) => {
  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-width duration-300 flex flex-col bg-[#015a8b]/50 flex-shrink-0`}
    >
      <div className="p-4 bg-[#015a8b] border-b border-white flex justify-between items-start">
        {!collapsed && (
          <div className="flex-1 pr-8">
            <h1 className="text-white text-base sm:text-lg md:text-xl font-bold truncate whitespace-nowrap">
              Patient Proxy
            </h1>
            <p className="text-white text-xs sm:text-sm truncate whitespace-nowrap">
              v1.0
            </p>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`text-white hover:bg-[#216f99]/80 p-1 rounded-md flex-shrink-0 ${
            collapsed ? "mx-auto" : "ml-2"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <nav className="space-y-1">
          <SidebarLink
            href="/patient-profiles?bypass=true"
            label={collapsed ? "" : "Patient Profiles"}
            icon="📋"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/manage-profiles?bypass=true"
            label={collapsed ? "" : "Manage Profiles"}
            icon="✨"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/patient-interactions?bypass=true"
            label={collapsed ? "" : "Patient Interactions"}
            icon="🏥"
            collapsed={collapsed}
          />
          <SidebarLink
            href="/report-bug?bypass=true"
            label={collapsed ? "" : "Report a Bug"}
            icon="ℹ️"
            collapsed={collapsed}
          />
        </nav>
      </div>

      <div className="mt-auto py-4 border-t border-white">
        <Link
          href="#"
          className="flex items-center px-3 py-2 mx-2 text-white hover:bg-[#216f99]/80"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs sm:text-sm truncate whitespace-nowrap">
              Settings
            </span>
          )}
        </Link>
        <button
          onClick={onLogout}
          className="flex items-center px-3 py-2 mx-2 text-white hover:bg-[#216f99]/80 w-full text-left"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-3 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs sm:text-sm truncate whitespace-nowrap">
              Logout
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
