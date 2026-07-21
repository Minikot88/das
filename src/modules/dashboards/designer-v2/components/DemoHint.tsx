import React, { memo, useState } from "react";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";

type DemoHintProps = {
  id: string;
  title: string;
  description: string;
};

function isHintVisible(storageKey: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey) !== "hidden";
  } catch {
    return true;
  }
}

function DemoHint({ id, title, description }: DemoHintProps) {
  const storageKey = `dashboard-v2-demo-hint-${id}`;
  const [visible, setVisible] = useState(() => isHintVisible(storageKey));

  if (!visible) return null;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: tokens.color.borderSubtle,
        bgcolor: tokens.color.surfaceMuted,
        px: 0.75,
        py: 0.5,
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={0.75}>
        <TipsAndUpdatesRoundedIcon sx={{ fontSize: 14, color: "primary.main", mt: 0.15 }} />
        <Box minWidth={0} flex={1}>
          <Typography variant="caption" sx={{ display: "block", color: "text.primary", fontSize: 10, fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 400, lineHeight: 1.35 }}>
            {description}
          </Typography>
        </Box>
        <IconButton
          aria-label="ซ่อนคำแนะนำ"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey, "hidden");
            } catch {
              // Keep the hint dismissible for this session when storage is blocked.
            }
            setVisible(false);
          }}
          sx={{ width: 22, height: 22 }}
        >
          <CloseRoundedIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}

export default memo(DemoHint);
