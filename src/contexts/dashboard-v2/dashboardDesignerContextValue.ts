import { createContext } from "react";
import type { DashboardDesignerStateValue } from "@/hooks/dashboard-v2/useDashboardDesignerState";

export const DashboardDesignerContext = createContext<DashboardDesignerStateValue | null>(null);
