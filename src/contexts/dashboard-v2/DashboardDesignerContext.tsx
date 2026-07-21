import React from "react";
import { useDashboardDesignerState } from "@/hooks/dashboard-v2/useDashboardDesignerState";
import { DashboardDesignerContext } from "@/contexts/dashboard-v2/dashboardDesignerContextValue";

export function DashboardDesignerProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboardDesignerState();
  return <DashboardDesignerContext.Provider value={value}>{children}</DashboardDesignerContext.Provider>;
}
