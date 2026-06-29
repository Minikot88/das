import React, { memo } from "react";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "./theme";
import type { DemoTemplate } from "./demo/demoTypes";

type TemplateDialogProps = {
  open: boolean;
  templates: DemoTemplate[];
  activeTemplateId: string | null;
  onApply: (templateId: string) => void;
  onClose: () => void;
};

function TemplateDialog({ open, templates, activeTemplateId, onApply, onClose }: TemplateDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
            <DashboardCustomizeRoundedIcon sx={{ color: "primary.main", fontSize: 18 }} />
            <Box minWidth={0}>
              <Typography variant="h6" noWrap>
                Templates สำหรับเดโม
              </Typography>
              <Typography variant="caption" color="text.secondary">
                เลือก template แล้วระบบจะตั้งค่า chart, mapping และ theme ให้ทันที
              </Typography>
            </Box>
          </Stack>
          <IconButton aria-label="ปิด Templates" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 2.5, bgcolor: tokens.color.background }}>
        <Box
          className="dashboard-v2-scrollarea"
          sx={{
            maxHeight: 520,
            overflow: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: 1,
          }}
        >
          {templates.map((template) => {
            const selected = template.id === activeTemplateId;
            return (
              <Box
                key={template.id}
                sx={{
                  border: "1px solid",
                  borderColor: selected ? tokens.color.selectedBorder : tokens.color.borderSubtle,
                  bgcolor: selected ? tokens.color.selectedSurface : tokens.color.surface,
                  p: 1.25,
                  minHeight: 164,
                  display: "grid",
                  gridTemplateRows: "auto minmax(0, 1fr) auto",
                  gap: 1,
                }}
              >
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: tokens.color.borderSubtle,
                        bgcolor: tokens.color.surfaceMuted,
                      }}
                    >
                      <AutoAwesomeRoundedIcon sx={{ fontSize: 16, color: selected ? "primary.main" : "text.secondary" }} />
                    </Box>
                    <Chip label={template.chartType} size="small" sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: "text.primary" }}>
                      {template.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 400 }}>
                      {template.audience}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                  {template.description}
                </Typography>
                <Button
                  variant={selected ? "contained" : "outlined"}
                  size="small"
                  fullWidth
                  onClick={() => {
                    onApply(template.id);
                    onClose();
                  }}
                >
                  {selected ? "ใช้งานอยู่" : "ใช้ Template"}
                </Button>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default memo(TemplateDialog);
