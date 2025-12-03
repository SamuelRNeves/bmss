"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/useAuth";
import { GlobalLoadingOverlay } from "@/lib/globalLoading";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GlobalLoadingOverlay>
      <AuthProvider>{children}</AuthProvider>
    </GlobalLoadingOverlay>
  );
}
