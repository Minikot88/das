import { createContext } from "react";
import type { DashboardDesignerStateValue } from "@modules/dashboards/designer-v2/hooks/useDashboardDesignerState";

export const DashboardDesignerContext = createContext<DashboardDesignerStateValue | null>(null);
