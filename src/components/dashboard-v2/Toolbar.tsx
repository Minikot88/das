import React, { memo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MonitorRoundedIcon from "@mui/icons-material/MonitorRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TabletMacRoundedIcon from "@mui/icons-material/TabletMacRounded";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { AppBar, Box, Button, ButtonGroup, Divider, IconButton, Menu, MenuItem, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { dashboardV2Tokens as tokens } from "./theme";
import type { ChartType, DeviceMode } from "./types";

type DesignerToolbarProps = {
  deviceMode: DeviceMode;
  zoom: number;
  onDeviceChange: (mode: DeviceMode) => void;
  onZoomChange: (zoom: number) => void;
  onSelectChart: (chartType: ChartType) => void;
  onRefresh: () => void;
  onFocusFilter: () => void;
  onAddText: () => void;
  onImageSelected: (imageName: string) => void;
  onOpenTemplates: () => void;
  onOpenSql: () => void;
  onFeaturePreview: (featureId: string) => void;
};

function DesignerToolbar({
  deviceMode,
  zoom,
  onDeviceChange,
  onZoomChange,
  onSelectChart,
  onRefresh,
  onFocusFilter,
  onAddText,
  onImageSelected,
  onOpenTemplates,
  onOpenSql,
  onFeaturePreview,
}: DesignerToolbarProps) {
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);

  const insertActions: Array<{ label: string; icon: React.ReactNode; run: () => void }> = [
    { label: "Chart", icon: <BarChartRoundedIcon />, run: () => onSelectChart("bar") },
    { label: "KPI", icon: <TrendingUpRoundedIcon />, run: () => onSelectChart("kpi-card") },
    { label: "Table", icon: <TableChartRoundedIcon />, run: () => onSelectChart("table") },
    { label: "Filter", icon: <FilterAltRoundedIcon />, run: onFocusFilter },
    { label: "Text", icon: <TextFieldsRoundedIcon />, run: onAddText },
  ];

  function runAddAction(action: () => void) {
    setAddAnchor(null);
    action();
  }

  function handleImageInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onImageSelected(file.name);
    event.target.value = "";
    setAddAnchor(null);
  }

  return (
    <AppBar
      data-testid="dashboard-v2-toolbar"
      component="nav"
      position="static"
      elevation={0}
      color="inherit"
      aria-label="เครื่องมือตัวสร้างกราฟ"
      sx={{
        height: 42,
        flex: "0 0 42px",
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: tokens.color.surface,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "42px !important",
          height: 42,
          px: { xs: 1.5, md: 1.5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          overflow: "hidden",
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{
            flex: 1,
            minWidth: 0,
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            endIcon={<KeyboardArrowDownRoundedIcon />}
            onClick={(event) => setAddAnchor(event.currentTarget)}
            sx={{
              minWidth: 88,
              height: 32,
              minHeight: 32,
              px: 1.25,
              "& .MuiButton-startIcon svg, & .MuiButton-endIcon svg": { fontSize: 16 },
            }}
          >
            Add
          </Button>
          <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
            {insertActions.map((item) => (
              <MenuItem key={item.label} onClick={() => runAddAction(item.run)}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ display: "grid", placeItems: "center", color: "text.secondary", "& svg": { fontSize: 16 } }}>
                    {item.icon}
                  </Box>
                  <Typography variant="body2">{item.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
            <MenuItem component="label">
              <input hidden type="file" accept="image/*" onChange={handleImageInput} />
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ display: "grid", placeItems: "center", color: "text.secondary", "& svg": { fontSize: 16 } }}>
                  <ImageRoundedIcon />
                </Box>
                <Typography variant="body2">Image</Typography>
              </Stack>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => runAddAction(() => onFeaturePreview("real-database"))}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ display: "grid", placeItems: "center", color: "text.secondary", "& svg": { fontSize: 16 } }}>
                  <DashboardCustomizeRoundedIcon />
                </Box>
                <Box>
                  <Typography variant="body2">Database Connection</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Coming soon
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
          </Menu>

          <Button
            variant="outlined"
            startIcon={<DashboardCustomizeRoundedIcon />}
            onClick={onOpenTemplates}
            sx={{ height: 32, minHeight: 32, px: 1.25, "& .MuiButton-startIcon svg": { fontSize: 16 } }}
          >
            Templates
          </Button>
          <Button
            variant="outlined"
            startIcon={<TerminalRoundedIcon />}
            onClick={onOpenSql}
            sx={{ height: 32, minHeight: 32, px: 1.25, "& .MuiButton-startIcon svg": { fontSize: 16 } }}
          >
            SQL
          </Button>

          <Divider orientation="vertical" flexItem />

          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              bgcolor: tokens.color.surface,
            }}
          >
            {insertActions.map((item) => (
              <Tooltip title={item.label} key={item.label}>
                <Button
                  variant="text"
                  color="inherit"
                  startIcon={item.icon}
                  onClick={item.run}
                  sx={{
                    minWidth: { xs: 30, sm: 54 },
                    width: { xs: 30, sm: "auto" },
                    height: 32,
                    minHeight: 32,
                    px: { xs: 0.75, sm: 1 },
                    color: "text.primary",
                    gap: 0.75,
                    "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0 } },
                    "& .MuiButton-startIcon svg": { fontSize: 16 },
                  }}
                >
                  <Typography variant="caption" sx={{ display: { xs: "none", sm: "inline" }, fontSize: 12, lineHeight: 1.35 }}>
                    {item.label}
                  </Typography>
                </Button>
              </Tooltip>
            ))}
            <Tooltip title="Image">
              <Button
                component="label"
                variant="text"
                color="inherit"
                startIcon={<ImageRoundedIcon />}
                sx={{ minWidth: { xs: 30, sm: 54 }, width: { xs: 30, sm: "auto" }, height: 32, minHeight: 32, px: { xs: 0.75, sm: 1 } }}
              >
                <input hidden type="file" accept="image/*" onChange={handleImageInput} />
                <Typography variant="caption" sx={{ display: { xs: "none", sm: "inline" }, fontSize: 12 }}>Image</Typography>
              </Button>
            </Tooltip>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton aria-label="รีเฟรชข้อมูล" onClick={onRefresh}>
              <RefreshRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <ButtonGroup
            variant="outlined"
            aria-label="ซูม"
            sx={{
              borderRadius: `${tokens.radius.control}px`,
              overflow: "hidden",
              "& .MuiButton-root": { height: 32, minHeight: 32 },
            }}
          >
            <Button startIcon={<ZoomInRoundedIcon />} onClick={() => onZoomChange(Math.min(160, zoom + 10))} aria-label="เพิ่มซูม">
              {zoom}%
            </Button>
            <Button onClick={() => onZoomChange(100)} aria-label="รีเซ็ตซูม">
              Fit
            </Button>
          </ButtonGroup>
          <ButtonGroup
            variant="outlined"
            aria-label="ขนาดหน้าจอ"
            sx={{
              borderRadius: `${tokens.radius.control}px`,
              overflow: "hidden",
              "& .MuiIconButton-root": {
                width: 30,
                height: 32,
                borderRadius: 0,
              },
            }}
          >
            <Tooltip title="Desktop">
              <IconButton color={deviceMode === "desktop" ? "primary" : "default"} onClick={() => onDeviceChange("desktop")} aria-label="Desktop">
                <MonitorRoundedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Tablet">
              <IconButton color={deviceMode === "tablet" ? "primary" : "default"} onClick={() => onDeviceChange("tablet")} aria-label="Tablet">
                <TabletMacRoundedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mobile">
              <IconButton color={deviceMode === "mobile" ? "primary" : "default"} onClick={() => onDeviceChange("mobile")} aria-label="Mobile">
                <PhoneIphoneRoundedIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default memo(DesignerToolbar);
