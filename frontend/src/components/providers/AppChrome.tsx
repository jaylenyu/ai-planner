"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/ui/Footer";
import { GlobalNav } from "@/components/ui/GlobalNav";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute ? <GlobalNav /> : null}
      <div className="flex flex-1 flex-col">{children}</div>
      {!isAdminRoute ? <Footer /> : null}
    </>
  );
}
