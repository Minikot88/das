import React, { createContext, useContext } from "react";
import { useDashboardDesignerState, type DashboardDesignerStateValue } from "@/hooks/dashboard-v2/useDashboardDesignerState";

const DashboardDesignerContext = createContext<DashboardDesignerStateValue | null>(null);

export function DashboardDesignerProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboardDesignerState();
  return <DashboardDesignerContext.Provider value={value}>{children}</DashboardDesignerContext.Provider>;
}

export function useDashboardDesigner() {
  const context = useContext(DashboardDesignerContext);
  if (!context) {
    throw new Error("useDashboardDesigner must be used within DashboardDesignerProvider");
  }
  return context;
}
