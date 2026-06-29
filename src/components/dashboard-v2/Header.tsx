import React, { memo, useState } from "react";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudSyncRoundedIcon from "@mui/icons-material/CloudSyncRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { dashboardV2Tokens as tokens } from "./theme";

type DesignerHeaderProps = {
  canUndo: boolean;
  canRedo: boolean;
  previewMode: boolean;
  saveStatus: "saved" | "saving" | "unsaved";
  lastSavedAt: string;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onShare: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportPng: () => void;
  onExportDemoReport: () => void;
  onFeaturePreview: (featureId: string) => void;
  onGoHome: () => void;
  onGoDashboard: () => void;
  onPageBack: () => void;
  onPageForward: () => void;
  canPageBack: boolean;
  canPageForward: boolean;
};

function DesignerHeader({
  canUndo,
  canRedo,
  previewMode,
  saveStatus,
  lastSavedAt,
  onUndo,
  onRedo,
  onTogglePreview,
  onShare,
  onExportJson,
  onExportCsv,
  onExportPng,
  onExportDemoReport,
  onFeaturePreview,
  onGoHome,
  onGoDashboard,
  onPageBack,
  onPageForward,
  canPageBack,
  canPageForward,
}: DesignerHeaderProps) {
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const saveLabel = saveStatus === "saving" ? "กำลังบันทึก" : saveStatus === "unsaved" ? "ยังไม่บันทึก" : "บันทึกแล้ว";
  const SaveIcon = saveStatus === "saving" ? CloudSyncRoundedIcon : CloudDoneRoundedIcon;

  function closeExportMenu() {
    setExportAnchor(null);
  }

  return (
    <AppBar
      data-testid="dashboard-v2-header"
      position="static"
      elevation={0}
      color="inherit"
      sx={{
        height: 46,
        flex: "0 0 46px",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: tokens.color.surface,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "46px !important",
          height: 46,
          px: { xs: 1.5, md: 1.5 },
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "200px minmax(0, 1fr)", md: "200px minmax(0, 1fr) auto" },
          alignItems: "center",
          gap: 1.5,
          overflow: "hidden",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" minWidth={0} sx={{ display: { xs: "none", sm: "flex" } }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 26,
              height: 26,
              borderRadius: `${tokens.radius.control}px`,
              display: "grid",
              placeItems: "center",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              fontWeight: 500,
              fontSize: 11,
            }}
          >
            BI
          </Box>
          <Box minWidth={0}>
            <Typography variant="h6" noWrap sx={{ fontSize: 14, lineHeight: 1.35 }}>
              Mini BI
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.35, fontSize: 10 }}>
              พื้นที่ทำงาน 01
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" minWidth={0} sx={{ overflow: "hidden" }}>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: "0 0 auto" }}>
            <Tooltip title={canPageBack ? "ย้อนกลับ" : "อยู่ที่หน้าหลักแล้ว"}>
              <span>
                <IconButton size="small" aria-label="ย้อนกลับ" onClick={onPageBack} disabled={!canPageBack} title={canPageBack ? "ย้อนกลับ" : "อยู่ที่หน้าหลักแล้ว"} sx={{ width: 28, height: 28 }}>
                  <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={canPageForward ? "ไปข้างหน้า" : "ไม่มีหน้าถัดไป"}>
              <span>
                <IconButton size="small" aria-label="ไปข้างหน้า" onClick={onPageForward} disabled={!canPageForward} title={canPageForward ? "ไปข้างหน้า" : "ไม่มีหน้าถัดไป"} sx={{ width: 28, height: 28 }}>
                  <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" }, fontSize: 11 }}>
            แดชบอร์ด
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" }, fontSize: 11 }}>
            /
          </Typography>
          <Typography variant="h6" noWrap sx={{ fontSize: { xs: 14, sm: 14 }, color: "text.primary", lineHeight: 1.35 }}>
            ตัวสร้างกราฟ
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              px: 0.75,
              height: 20,
              border: `1px solid ${saveStatus === "unsaved" ? tokens.color.warningBorder : tokens.color.successBorder}`,
              borderRadius: `${tokens.radius.pill}px`,
              bgcolor: saveStatus === "unsaved" ? tokens.color.warningSoft : tokens.color.successSoft,
              color: saveStatus === "unsaved" ? tokens.color.warning : tokens.color.success,
            }}
          >
            <SaveIcon sx={{ fontSize: 11 }} />
            <Typography variant="caption" noWrap sx={{ display: { xs: "none", sm: "block" }, fontSize: 10, lineHeight: 1.35, color: "inherit" }}>
              {saveLabel}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", lg: "block" } }}>
            {lastSavedAt}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="flex-end"
          sx={{
            display: { xs: "none", md: "flex" },
            "& .MuiIconButton-root": { width: 28, height: 28 },
            "& .MuiButton-root": { height: 30, minHeight: 30, px: 1.25 },
            "& .MuiButton-startIcon svg": { fontSize: 16 },
          }}
        >
          <Tooltip title="ย้อนกลับ">
            <span>
              <IconButton aria-label="ย้อนกลับ" onClick={onUndo} disabled={!canUndo} title={canUndo ? "ย้อนกลับการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ย้อนกลับ"}>
                <UndoRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="ทำซ้ำ">
            <span>
              <IconButton aria-label="ทำซ้ำ" onClick={onRedo} disabled={!canRedo} title={canRedo ? "ทำซ้ำการเปลี่ยนแปลงล่าสุด" : "ยังไม่มีประวัติให้ทำซ้ำ"}>
                <RedoRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Button size="small" variant="outlined" startIcon={<DashboardCustomizeRoundedIcon />} onClick={onGoDashboard}>
            กลับแดชบอร์ด
          </Button>
          <Button size="small" variant="outlined" startIcon={<HomeRoundedIcon />} onClick={onGoHome}>
            หน้าหลัก
          </Button>
          <Button
            variant={previewMode ? "contained" : "outlined"}
            size="small"
            startIcon={previewMode ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
            onClick={onTogglePreview}
            aria-label={previewMode ? "ออกจากโหมด Preview" : "ดูตัวอย่าง"}
          >
            {previewMode ? "Exit" : "Preview"}
          </Button>
          <Button size="small" variant="outlined" startIcon={<ShareRoundedIcon />} onClick={onShare}>
            แชร์
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={(event) => setExportAnchor(event.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={Boolean(exportAnchor)}
          >
            Export
          </Button>
          <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={closeExportMenu}>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onExportJson();
              }}
            >
              Export JSON config
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onExportCsv();
              }}
            >
              Export CSV data
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                void onExportPng();
              }}
            >
              Export PNG preview
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onExportDemoReport();
              }}
            >
              Export Demo Report
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onFeaturePreview("pdf-export");
              }}
            >
              Export PDF
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onFeaturePreview("scheduled-email");
              }}
            >
              Scheduled reports
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onFeaturePreview("advanced-permissions");
              }}
            >
              Permissions
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeExportMenu();
                onFeaturePreview("real-api-sync");
              }}
            >
              Real API sync
            </MenuItem>
          </Menu>
          <Tooltip title="ผู้ใช้">
            <Avatar sx={{ width: 24, height: 24, bgcolor: tokens.color.primarySoft, color: "primary.main", fontWeight: 500 }}>
              <AccountCircleRoundedIcon sx={{ fontSize: 16 }} />
            </Avatar>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default memo(DesignerHeader);
