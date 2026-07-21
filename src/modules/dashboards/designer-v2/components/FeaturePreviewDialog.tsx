import React, { memo } from "react";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { FutureFeature } from "@modules/dashboards/designer-v2/components/demo/demoTypes";

type FeaturePreviewDialogProps = {
  feature: FutureFeature | null;
  onClose: () => void;
};

function FeaturePreviewDialog({ feature, onClose }: FeaturePreviewDialogProps) {
  return (
    <Dialog
      open={Boolean(feature)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: `${tokens.radius.dialog}px`,
          border: "1px solid",
          borderColor: tokens.color.borderSubtle,
          boxShadow: tokens.shadow.dialog,
        },
      }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1.5, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
                bgcolor: tokens.color.primarySubtle,
                color: "primary.main",
              }}
            >
              <RocketLaunchRoundedIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box>
              <Typography variant="h6">{feature?.title ?? "Feature Preview"}</Typography>
              <Typography variant="caption" color="text.secondary">
                Coming soon
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="ปิด Feature Preview" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5 }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {feature?.description}
          </Typography>
          <Box sx={{ border: "1px solid", borderColor: tokens.color.borderSubtle, bgcolor: tokens.color.surfaceMuted, p: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Planned phase
            </Typography>
            <Typography variant="subtitle2">{feature?.plannedPhase}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
            ในเดโมนี้เรายังไม่เชื่อม backend จริง จึงแสดง roadmap modal แทนปุ่มหลอก
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 0 }}>
        <Button variant="contained" onClick={onClose} sx={{ height: 30, minHeight: 30 }}>
          รับทราบ
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default memo(FeaturePreviewDialog);
