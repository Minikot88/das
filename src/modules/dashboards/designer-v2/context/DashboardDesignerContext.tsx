import React from "react";
import { useDashboardDesignerState } from "@modules/dashboards/designer-v2/hooks/useDashboardDesignerState";
import { DashboardDesignerContext } from "@modules/dashboards/designer-v2/context/dashboardDesignerContextValue";

export function DashboardDesignerProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboardDesignerState();
  return <DashboardDesignerContext.Provider value={value}>{children}</DashboardDesignerContext.Provider>;
}
