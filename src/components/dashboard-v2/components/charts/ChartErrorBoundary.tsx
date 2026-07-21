import React from "react";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { Box, Button, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@/components/dashboard-v2/theme";

type ChartErrorBoundaryProps = {
  children: React.ReactNode;
  onReset: () => void;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export default class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[DashboardDesignerV2] chart preview crashed", error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, message: "" });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box
        sx={{
          height: "100%",
          minHeight: 220,
          display: "grid",
          placeItems: "center",
          border: "1px solid",
          borderColor: "#F8C08A",
          bgcolor: "#FFF7ED",
        }}
      >
        <Stack spacing={1.25} alignItems="center" sx={{ px: 3, maxWidth: 440, textAlign: "center" }}>
          <WarningAmberRoundedIcon sx={{ color: "#EA580C" }} />
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#9A3412" }}>พรีวิวกราฟขัดข้อง</Typography>
          <Typography sx={{ fontSize: 12, color: "#9A3412", lineHeight: 1.6 }}>
            {this.state.message || "ไม่สามารถแสดงผลกราฟจากการตั้งค่าปัจจุบันได้"}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RestartAltRoundedIcon />}
            onClick={this.reset}
            sx={{
              borderColor: "#FDBA74",
              color: "#9A3412",
              "&:hover": { borderColor: "#EA580C", bgcolor: tokens.color.warningSoft },
            }}
          >
            รีเซ็ตกราฟ
          </Button>
        </Stack>
      </Box>
    );
  }
}
