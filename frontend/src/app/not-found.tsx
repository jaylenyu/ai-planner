"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/custom/Spinner";

// 존재하지 않는 경로로 접근하면 메인으로 되돌린다.
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[var(--background)]">
      <Spinner />
    </main>
  );
}
