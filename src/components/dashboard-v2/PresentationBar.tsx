import React, { memo } from "react";
import CloseFullscreenRoundedIcon from "@mui/icons-material/CloseFullscreenRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import TabletMacRoundedIcon from "@mui/icons-material/TabletMacRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { Box, Button, ButtonGroup, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "./theme";
import type { DeviceMode } from "./types";

type PresentationBarProps = {
  deviceMode: DeviceMode;
  zoom: number;
  onExit: () => void;
  onDeviceChange: (mode: DeviceMode) => void;
  onZoomChange: (zoom: number) => void;
  onShare: () => void;
  onExportPng: () => void;
};

function PresentationBar({ deviceMode, zoom, onExit, onDeviceChange, onZoomChange, onShare, onExportPng }: PresentationBarProps) {
  return (
    <Box
      sx={{
        height: 42,
        flex: "0 0 42px",
        borderBottom: "1px solid",
        borderColor: tokens.color.borderSubtle,
        bgcolor: tokens.color.surface,
        px: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
        <Typography variant="subtitle2" noWrap sx={{ fontSize: 13 }}>
          Presentation Mode
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
          ซ่อนเครื่องมือแก้ไขและขยาย Preview สำหรับนำเสนอ
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <ButtonGroup variant="outlined" size="small" sx={{ "& .MuiButton-root": { height: 28, minHeight: 28, px: 1, fontSize: 11 } }}>
          <Button startIcon={<ZoomInRoundedIcon />} onClick={() => onZoomChange(Math.min(160, zoom + 10))}>
            {zoom}%
          </Button>
          <Button onClick={() => onZoomChange(100)}>Fit</Button>
        </ButtonGroup>
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Desktop">
            <IconButton color={deviceMode === "desktop" ? "primary" : "default"} onClick={() => onDeviceChange("desktop")}>
              <MonitorRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Tablet">
            <IconButton color={deviceMode === "tablet" ? "primary" : "default"} onClick={() => onDeviceChange("tablet")}>
              <TabletMacRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Mobile">
            <IconButton color={deviceMode === "mobile" ? "primary" : "default"} onClick={() => onDeviceChange("mobile")}>
              <PhoneIphoneRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
        <Button variant="outlined" size="small" startIcon={<ShareRoundedIcon />} onClick={onShare} sx={{ height: 28, minHeight: 28 }}>
          แชร์
        </Button>
        <Button variant="contained" size="small" startIcon={<DownloadRoundedIcon />} onClick={onExportPng} sx={{ height: 28, minHeight: 28 }}>
          PNG
        </Button>
        <Button variant="outlined" size="small" startIcon={<CloseFullscreenRoundedIcon />} onClick={onExit} sx={{ height: 28, minHeight: 28 }}>
          ออกจากโหมดนำเสนอ
        </Button>
      </Stack>
    </Box>
  );
}

export default memo(PresentationBar);
