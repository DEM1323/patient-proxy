"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: string;
  collapsed?: boolean;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({
  href,
  label,
  icon,
  collapsed = false,
}) => {
  const pathname = usePathname();

  // Extract the base path from href (remove query parameters)
  const hrefBase = href.split("?")[0];

  // Check if the current path is the link or starts with the link path (for nested routes)
  const isActive =
    pathname === hrefBase ||
    (hrefBase !== "/" && pathname.startsWith(hrefBase));

  console.log(
    `Sidebar link: ${href}, Base path: ${hrefBase}, Current path: ${pathname}, Active: ${isActive}`
  );

  return (
    <Link
      href={href}
      className={`flex items-center px-3 py-2 mx-2 text-white hover:bg-[#216f99]/80 hover:rounded-md ${
        isActive ? "bg-[#216f99] rounded-md" : ""
      } ${collapsed ? "justify-center" : ""}`}
      title={label}
    >
      <span
        className={`text-base sm:text-lg flex-shrink-0 ${
          collapsed ? "" : "mr-3"
        }`}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className="text-xs sm:text-sm truncate whitespace-nowrap overflow-hidden">
          {label}
        </span>
      )}
    </Link>
  );
};
