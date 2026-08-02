import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import SortRoundedIcon from "@mui/icons-material/SortRounded";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useDrag, useDrop } from "react-dnd";
import { getDistinctFieldValues } from "@modules/dashboards/designer-v2/components/services/datasetService";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import { validateFieldForSlot } from "@modules/dashboards/designer-v2/components/utils/chartValidation";
import { mappingSummary } from "@modules/dashboards/designer-v2/components/utils/axisTitles";
import { getAggregationOptions } from "@modules/dashboards/designer-v2/components/utils/fieldAggregation";
import type { Aggregation, ChartType, DataField, DragFieldItem, FilterValue, MappingSlot, MappingSlotId } from "@modules/dashboards/designer-v2/components/types";

type FieldMappingProps = {
  mappings: MappingSlot[];
  rows: Record<string, string | number | boolean>[];
  filters: Record<string, FilterValue>;
  chartType: ChartType | null;
  focusedSlotId: MappingSlotId | null;
  selectedField: DataField | null;
  onDropField: (slotId: MappingSlotId, field: DataField, sourceSlotId?: MappingSlotId) => void;
  onRemoveField: (slotId: MappingSlotId, fieldId: string) => void;
  onAggregationChange: (slotId: MappingSlotId, aggregation: Aggregation) => void;
  onFilterChange: (field: DataField, value: FilterValue) => void;
  onSortSlot: (slotId: MappingSlotId) => void;
};

const primarySlotIds: MappingSlotId[] = ["xAxis", "yAxis", "legend", "tooltip"];
const secondarySlotIds: MappingSlotId[] = ["filter", "color", "size", "value", "category", "series", "rows", "columns"];
const measureSlotIds: MappingSlotId[] = ["yAxis", "value", "size", "color", "open", "high", "low", "close"];

const slotTone: Record<MappingSlotId, { bg: string; color: string }> = {
  xAxis: { bg: tokens.color.primarySoft, color: tokens.color.primary },
  yAxis: { bg: tokens.color.numberSoft, color: tokens.color.number },
  legend: { bg: tokens.color.purpleSurface, color: tokens.color.purple },
  tooltip: { bg: tokens.color.purpleSurface, color: tokens.color.purple },
  filter: { bg: tokens.color.warningSoft, color: tokens.color.warning },
  color: { bg: tokens.color.dangerSoft, color: tokens.color.danger },
  size: { bg: tokens.color.slateLight, color: tokens.color.slate },
  value: { bg: tokens.color.numberSoft, color: tokens.color.number },
  category: { bg: tokens.color.primarySoft, color: tokens.color.primary },
  series: { bg: tokens.color.purpleSurface, color: tokens.color.purple },
  rows: { bg: tokens.color.primarySoft, color: tokens.color.primary },
  columns: { bg: tokens.color.purpleSurface, color: tokens.color.purple },
  source: { bg: tokens.color.warningSoft, color: tokens.color.warning },
  target: { bg: tokens.color.warningSoft, color: tokens.color.warning },
  open: { bg: tokens.color.numberSoft, color: tokens.color.number },
  high: { bg: tokens.color.numberSoft, color: tokens.color.number },
  low: { bg: tokens.color.numberSoft, color: tokens.color.number },
  close: { bg: tokens.color.numberSoft, color: tokens.color.number },
};

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button,input,textarea,select,[role='button'],.MuiSelect-select,.MuiChip-root"));
}

function MappingChip({
  slotId,
  field,
  label,
  compact = false,
  onRemove,
}: {
  slotId: MappingSlotId;
  field: DataField;
  label: string;
  compact?: boolean;
  onRemove: () => void;
}) {
  const tone = slotTone[slotId];
  const [{ isDragging }, dragRef] = useDrag<DragFieldItem, void, { isDragging: boolean }>(() => ({
    type: "FIELD",
    item: { type: "FIELD", field, sourceSlotId: slotId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [field, slotId]);

  return (
    <Chip
      ref={(node) => { dragRef(node); }}
      icon={<DragIndicatorRoundedIcon />}
      label={label}
      onDelete={onRemove}
      deleteIcon={<CloseRoundedIcon />}
      aria-label={`${label} · ${field.table} · ${field.physicalType || field.type} · ${field.semanticType}`}
      title={`${field.table} · Physical: ${field.physicalType || field.type} · Semantic: ${field.semanticType}`}
      sx={{
        height: compact ? 22 : 24,
        maxWidth: "100%",
        minWidth: 0,
        bgcolor: tone.bg,
        color: tone.color,
        border: `1px solid ${tokens.color.border}`,
        opacity: isDragging ? 0.44 : 1,
        cursor: "grab",
        "& .MuiChip-icon": { color: tone.color, fontSize: compact ? 12 : 14 },
        "& .MuiChip-deleteIcon": { color: tone.color, opacity: 0.75, fontSize: compact ? 12 : 14 },
        "& .MuiChip-label": {
          px: compact ? 0.5 : 0.75,
          fontSize: compact ? 11 : 12,
          lineHeight: 1.35,
          minHeight: 14,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

function FilterControl({
  field,
  rows,
  value,
  onChange,
}: {
  field: DataField;
  rows: Record<string, string | number | boolean>[];
  value?: FilterValue;
  onChange: (field: DataField, value: FilterValue) => void;
}) {
  const values = useMemo(() => getDistinctFieldValues(rows, field.id), [field.id, rows]);

  if (field.type === "number" || field.type === "currency" || field.type === "percentage") {
    const numberValue: Extract<FilterValue, { type: "number" }> = value?.type === "number" ? value : { type: "number", min: "", max: "" };
    return (
      <Stack direction="row" spacing={0.75}>
        <TextField
          size="small"
          label="ต่ำสุด"
          type="number"
          value={numberValue.min}
          onChange={(event) => onChange(field, { ...numberValue, min: event.target.value === "" ? "" : Number(event.target.value) })}
        />
        <TextField
          size="small"
          label="สูงสุด"
          type="number"
          value={numberValue.max}
          onChange={(event) => onChange(field, { ...numberValue, max: event.target.value === "" ? "" : Number(event.target.value) })}
        />
      </Stack>
    );
  }

  if (field.type === "date") {
    const dateValue: Extract<FilterValue, { type: "date" }> = value?.type === "date" ? value : { type: "date", start: "", end: "" };
    return (
      <Stack direction="row" spacing={0.75}>
        <TextField
          size="small"
          type="date"
          label="เริ่ม"
          value={dateValue.start}
          onChange={(event) => onChange(field, { ...dateValue, start: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="สิ้นสุด"
          value={dateValue.end}
          onChange={(event) => onChange(field, { ...dateValue, end: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    );
  }

  const current = value?.type === "text" || value?.type === "boolean" ? value.values : [];

  function handleValuesChange(event: SelectChangeEvent<string[]>) {
    const nextValue = event.target.value;
    const selected = typeof nextValue === "string" ? nextValue.split(",") : nextValue;
    onChange(field, { type: field.type === "boolean" ? "boolean" : "text", values: selected });
  }

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id={`${field.id}-filter-label`}>ค่า</InputLabel>
      <Select
        labelId={`${field.id}-filter-label`}
        multiple
        value={current}
        label="ค่า"
        onChange={handleValuesChange}
        renderValue={(selected) => selected.join(", ")}
      >
        {values.map((item) => (
          <MenuItem key={item} value={item}>
            <Checkbox checked={current.includes(item)} size="small" />
            <ListItemText primary={item} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function MappingDropZone({
  slot,
  rows,
  filters,
  focused,
  chartType,
  selectedField,
  onDropField,
  onRemoveField,
  onAggregationChange,
  onFilterChange,
  onSortSlot,
  onClearSlot,
  compact = false,
}: {
  slot: MappingSlot;
  rows: Record<string, string | number | boolean>[];
  filters: Record<string, FilterValue>;
  focused: boolean;
  chartType: ChartType | null;
  selectedField: DataField | null;
  onDropField: FieldMappingProps["onDropField"];
  onRemoveField: FieldMappingProps["onRemoveField"];
  onAggregationChange: FieldMappingProps["onAggregationChange"];
  onFilterChange: FieldMappingProps["onFilterChange"];
  onSortSlot: FieldMappingProps["onSortSlot"];
  onClearSlot?: (slotId: MappingSlotId) => void;
  compact?: boolean;
}) {
  const options = getAggregationOptions(slot);
  const [{ isOver, validDrop }, dropRef] = useDrop<DragFieldItem, void, { isOver: boolean; validDrop: boolean }>(() => ({
    accept: "FIELD",
    drop: (item) => onDropField(slot.id, item.field, item.sourceSlotId),
    collect: (monitor) => {
      const item = monitor.getItem();
      return {
        isOver: monitor.isOver({ shallow: true }),
        validDrop: item ? validateFieldForSlot(slot.id, item.field, chartType) : true,
      };
    },
  }), [chartType, onDropField, slot.id]);

  const aggregation = options.includes(slot.aggregation ?? "None") ? slot.aggregation ?? "None" : options[0];
  const firstFieldSummary = slot.fields[0] ? mappingSummary(slot.id, slot.fields[0], aggregation) : null;
  const showAggregationControl = !compact && measureSlotIds.includes(slot.id);
  const selectedFieldCompatible = selectedField ? validateFieldForSlot(slot.id, selectedField, chartType) : false;
  const selectedFieldIncompatible = Boolean(selectedField && !selectedFieldCompatible);
  const dropBorderColor = isOver && !validDrop
    ? tokens.color.danger
    : isOver || focused || selectedFieldCompatible
      ? tokens.color.primary
      : selectedFieldIncompatible
        ? tokens.color.borderSubtle
        : tokens.color.borderStrong;
  const dropBackground = isOver && !validDrop
    ? tokens.color.dangerSoft
    : isOver || focused || selectedFieldCompatible
      ? tokens.color.selectedSurface
      : "background.paper";

  return (
    <Box
      ref={(node: HTMLDivElement | null) => { dropRef(node); }}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        if (!selectedField || isInteractiveTarget(event.target)) return;
        onDropField(slot.id, selectedField);
      }}
      sx={{
        minWidth: 0,
        height: "100%",
        minHeight: compact ? 56 : 64,
        p: compact ? 0.75 : 0.5,
        border: "1px dashed",
        borderColor: dropBorderColor,
        bgcolor: dropBackground,
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        cursor: selectedFieldCompatible ? "copy" : "default",
        opacity: selectedFieldIncompatible ? 0.62 : 1,
        overflow: "visible",
        transition: `background-color ${tokens.motion.base}, border-color ${tokens.motion.base}, opacity ${tokens.motion.base}`,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.75}>
        <Box minWidth={0}>
          <Typography variant="subtitle2" noWrap sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1.35 }}>
            {slot.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: firstFieldSummary ? "block" : "none", fontSize: 10, lineHeight: 1.25 }}>
            {firstFieldSummary?.reason ?? slot.helper}
          </Typography>
        </Box>
        {compact ? (
          slot.fields.length ? (
            <IconButton size="small" onClick={() => onClearSlot?.(slot.id)} aria-label={`clear ${slot.label}`} sx={{ width: 20, height: 20 }}>
              <CloseRoundedIcon sx={{ fontSize: 13 }} />
            </IconButton>
          ) : null
        ) : (
          <IconButton size="small" onClick={() => onSortSlot(slot.id)} aria-label={`จัดเรียง ${slot.label}`} sx={{ width: 22, height: 22 }}>
            <SortRoundedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Stack>

      <Box
        sx={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: showAggregationControl ? "minmax(82px, 1fr) 52px" : "minmax(0, 1fr)",
          alignItems: "center",
          gap: 0.5,
          overflow: "visible",
        }}
      >
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ minHeight: 24, minWidth: 0, overflow: "visible" }}>
          {slot.fields.length ? (
            slot.fields.map((field) => (
              <MappingChip
                key={field.id}
                slotId={slot.id}
                field={field}
                compact={compact}
                label={
                  showAggregationControl
                    ? field.label
                    : `${field.label}${slot.aggregation && slot.aggregation !== "None" ? ` (${slot.aggregation})` : ""}`
                }
                onRemove={() => onRemoveField(slot.id, field.id)}
              />
            ))
          ) : (
            <Box
              component="button"
              type="button"
              disabled={!selectedFieldCompatible}
              onClick={() => {
                if (selectedFieldCompatible && selectedField) onDropField(slot.id, selectedField);
              }}
              aria-label={selectedField ? `คลิกเพื่อใส่ ${selectedField.name} ใน ${slot.label}` : `ลากฟิลด์มาที่ ${slot.label}`}
              sx={{
                width: "100%",
                minHeight: 22,
                px: 1,
                display: "grid",
                placeItems: "center",
                border: "1px dashed",
                borderColor: selectedFieldCompatible ? tokens.color.selectedBorder : tokens.color.borderStrong,
                color: tokens.color.textMuted,
                bgcolor: selectedFieldCompatible ? tokens.color.primarySubtle : tokens.color.surfaceMuted,
                fontSize: 10,
                lineHeight: 1.35,
                fontWeight: 400,
                fontFamily: "inherit",
                cursor: selectedFieldCompatible ? "copy" : "default",
                appearance: "none",
                "&:focus-visible": {
                  outline: `2px solid ${tokens.color.focusRing}`,
                  outlineOffset: 2,
                },
              }}
            >
              ลากฟิลด์มาที่นี่
            </Box>
          )}
        </Stack>

        {["xAxis", "legend", "color", "size", "category", "series", "columns", "source", "target", "open", "high", "low", "close"].includes(slot.id)
          && slot.fields.length
          && selectedFieldCompatible
          && selectedField
          && !slot.fields.some((field) => field.id === selectedField.id) ? (
          <Button
            size="small"
            onClick={() => onDropField(slot.id, selectedField)}
            aria-label={`แทนที่ ${slot.label} ด้วย ${selectedField.name}`}
            sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: 10, lineHeight: 1.35 }}
          >
            ใช้ {selectedField.name}
          </Button>
        ) : null}

        {showAggregationControl ? (
          <Select
            size="small"
            value={aggregation}
            onChange={(event) => onAggregationChange(slot.id, event.target.value as Aggregation)}
            disabled={!slot.fields.length || options.length === 1}
            aria-label={`aggregation ${slot.label}`}
            sx={{
              height: 28,
              maxWidth: "100%",
              minWidth: 0,
              "& .MuiSelect-select": { py: 0.25, pl: 0.75, pr: "18px !important", fontSize: 10, lineHeight: 1.35 },
            }}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        ) : null}
      </Box>
      {slot.fields[0] ? (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 9.5 }}>
          {slot.fields[0].sourceAlias || slot.fields[0].table} · {slot.fields[0].physicalType || slot.fields[0].type} · {slot.fields[0].semanticType}
          {slot.aggregation && slot.aggregation !== "None" ? ` · ${slot.aggregation}` : ""}
        </Typography>
      ) : null}

      {!compact && slot.id === "filter" && slot.fields.length ? (
          <Stack spacing={0.5} sx={{ mt: 0.25, overflow: "visible" }}>
            {slot.fields.map((field) => (
              <FilterControl
                key={field.id}
                field={field}
                rows={rows}
                value={filters[field.id]}
                onChange={onFilterChange}
              />
            ))}
          </Stack>
        ) : null}
    </Box>
  );
}

function FieldMapping({
  mappings,
  rows,
  filters,
  chartType,
  focusedSlotId,
  selectedField,
  onDropField,
  onRemoveField,
  onAggregationChange,
  onFilterChange,
  onSortSlot,
}: FieldMappingProps) {
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const axislessPrimary = chartType === "pie" || chartType === "donut";
  const activePrimarySlotIds: MappingSlotId[] = axislessPrimary
    ? ["category", "value", "legend", "tooltip"]
    : primarySlotIds;
  const primarySlots = mappings.filter((slot) => activePrimarySlotIds.includes(slot.id));
  const secondarySlots = mappings.filter((slot) => secondarySlotIds.includes(slot.id) && !activePrimarySlotIds.includes(slot.id));
  const secondaryHasContent = secondarySlots.some((slot) => slot.fields.length > 0);
  const moreOpen = Boolean(moreAnchorEl);

  useEffect(() => {
    if (focusedSlotId && secondarySlotIds.includes(focusedSlotId) && moreButtonRef.current) {
      setMoreAnchorEl(moreButtonRef.current);
    }
  }, [focusedSlotId]);

  function clearSlot(slotId: MappingSlotId) {
    const slot = mappings.find((item) => item.id === slotId);
    slot?.fields.forEach((field) => onRemoveField(slotId, field.id));
  }

  function clearAdvancedMappings() {
    secondarySlots.forEach((slot) => {
      slot.fields.forEach((field) => onRemoveField(slot.id, field.id));
    });
  }

  return (
    <Paper
      data-testid="dashboard-v2-field-mapping"
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 148,
        minWidth: 0,
        width: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        p: 0.75,
        position: "relative",
        zIndex: 3,
        overflow: "visible",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={0.75} sx={{ height: "100%", minHeight: 0, overflow: "visible" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ minHeight: 28 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: 12, lineHeight: 1.25 }}>
              Field Mapping
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: { xs: "none", lg: "block" }, lineHeight: 1.25 }}>
              ลากฟิลด์จาก DATA หรือย้าย chip ระหว่างช่อง
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.25 }}>
            {mappings.reduce((total, slot) => total + slot.fields.length, 0)} ฟิลด์ที่เลือก
          </Typography>
            <Button
              ref={moreButtonRef}
              size="small"
              variant={moreOpen || secondaryHasContent ? "outlined" : "text"}
              startIcon={<MoreHorizRoundedIcon />}
              aria-label="เปิด mapping ขั้นสูง"
              onClick={(event) => setMoreAnchorEl(event.currentTarget)}
              sx={{
                height: 28,
                minHeight: 28,
                px: 0.85,
                fontSize: 11,
                lineHeight: 1.2,
                bgcolor: moreOpen || secondaryHasContent ? tokens.color.selectedSurface : "transparent",
                "& .MuiButton-startIcon": { mr: 0.4 },
                "& .MuiButton-startIcon svg": { fontSize: 15 },
              }}
            >
              เพิ่มเติม
            </Button>
          </Stack>
        </Stack>
        <Box
          sx={{
            minHeight: 0,
            flex: 1,
            overflow: "visible",
            display: "grid",
            gridTemplateRows: "minmax(0, 1fr)",
            gap: 0.75,
          }}
        >
          <Box
            sx={{
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 0.75,
              alignItems: "stretch",
              overflow: "visible",
              "@media (min-width: 600px)": {
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              },
              "@media (min-width: 1400px)": {
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            {primarySlots.map((slot) => (
              <MappingDropZone
                key={slot.id}
                slot={slot}
                rows={rows}
                filters={filters}
                chartType={chartType}
                focused={focusedSlotId === slot.id}
                selectedField={selectedField}
                onDropField={onDropField}
                onRemoveField={onRemoveField}
                onAggregationChange={onAggregationChange}
                onFilterChange={onFilterChange}
                onSortSlot={onSortSlot}
              />
            ))}
          </Box>
        </Box>
      </Stack>
      <Popover
        open={moreOpen}
        anchorEl={moreAnchorEl}
        onClose={() => setMoreAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ zIndex: tokens.zIndex.popover }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "calc(100vw - 24px)", sm: 520 },
              maxWidth: 520,
              maxHeight: "calc(100dvh - 96px)",
              mt: 0.75,
              p: 1.5,
              border: "1px solid #E6EAF0",
              borderRadius: "8px",
              boxShadow: "0 12px 28px rgba(15,23,42,.10)",
              bgcolor: tokens.color.surface,
              overflow: "auto",
            },
          },
        }}
      >
        <Stack spacing={1.25}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.35 }}>
              เพิ่มเติม
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.35 }}>
              เลือกตำแหน่งฟิลด์ขั้นสูงสำหรับกราฟนี้
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
              gap: 0.75,
            }}
          >
            {secondarySlots.map((slot) => (
              <MappingDropZone
                key={slot.id}
                slot={slot}
                rows={rows}
                filters={filters}
                chartType={chartType}
                focused={focusedSlotId === slot.id}
                selectedField={selectedField}
                onDropField={onDropField}
                onRemoveField={onRemoveField}
                onAggregationChange={onAggregationChange}
                onFilterChange={onFilterChange}
                onSortSlot={onSortSlot}
                onClearSlot={clearSlot}
                compact
              />
            ))}
          </Box>

          <Divider />
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Tooltip title="ล้างเฉพาะช่องขั้นสูง">
              <Button variant="text" size="small" onClick={clearAdvancedMappings} sx={{ height: 28, px: 0.75 }}>
                Clear advanced mappings
              </Button>
            </Tooltip>
            <Button variant="contained" size="small" onClick={() => setMoreAnchorEl(null)} sx={{ height: 28, px: 1.5 }}>
              Done
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </Paper>
  );
}

export default memo(FieldMapping);
