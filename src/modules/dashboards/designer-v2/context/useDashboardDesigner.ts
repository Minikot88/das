import { useContext } from "react";
import { DashboardDesignerContext } from "@modules/dashboards/designer-v2/context/dashboardDesignerContextValue";

export function useDashboardDesigner() {
  const context = useContext(DashboardDesignerContext);
  if (!context) {
    throw new Error("useDashboardDesigner must be used within DashboardDesignerProvider");
  }
  return context;
}
