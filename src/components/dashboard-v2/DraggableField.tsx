import React, { memo } from "react";
import AbcRoundedIcon from "@mui/icons-material/AbcRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import NumbersRoundedIcon from "@mui/icons-material/NumbersRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import { Box, Typography } from "@mui/material";
import { useDrag } from "react-dnd";
import { dashboardV2Tokens as tokens } from "./theme";
import type { DataField, DragFieldItem, FieldType } from "./types";

const typeMeta: Record<FieldType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  date: { label: "Date", color: tokens.color.date, bg: tokens.color.dateSoft, icon: <CalendarMonthRoundedIcon /> },
  number: { label: "Number", color: tokens.color.number, bg: tokens.color.numberSoft, icon: <NumbersRoundedIcon /> },
  currency: { label: "Currency", color: tokens.color.number, bg: tokens.color.numberSoft, icon: <NumbersRoundedIcon /> },
  percentage: { label: "Percent", color: tokens.color.number, bg: tokens.color.numberSoft, icon: <NumbersRoundedIcon /> },
  geography: { label: "Geo", color: tokens.color.primary, bg: tokens.color.primarySoft, icon: <AbcRoundedIcon /> },
  text: { label: "Text", color: tokens.color.purple, bg: tokens.color.purpleSoft, icon: <AbcRoundedIcon /> },
  boolean: { label: "Boolean", color: tokens.color.warning, bg: tokens.color.warningSoft, icon: <ToggleOnRoundedIcon /> },
};

function DraggableField({
  field,
  selected = false,
  onSelect,
}: {
  field: DataField;
  selected?: boolean;
  onSelect?: (field: DataField) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag<DragFieldItem, void, { isDragging: boolean }>(() => ({
    type: "FIELD",
    item: { type: "FIELD", field },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [field]);

  const meta = typeMeta[field.type];

  return (
    <Box
      ref={dragRef}
      role="treeitem"
      tabIndex={0}
      onClick={() => onSelect?.(field)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(field);
        }
      }}
      aria-label={`${field.name} ${meta.label}`}
      aria-selected={selected}
      sx={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto",
        alignItems: "center",
        gap: 0.75,
        px: 0.75,
        py: 0,
        minHeight: 24,
        border: "1px solid",
        borderColor: selected ? tokens.color.selectedBorder : "transparent",
        borderRadius: `${tokens.radius.control}px`,
        cursor: "grab",
        bgcolor: selected ? tokens.color.selectedSurface : "transparent",
        opacity: isDragging ? 0.48 : 1,
        transition: `background-color ${tokens.motion.base}, border-color ${tokens.motion.base}`,
        "&:hover, &:focus-visible": {
          bgcolor: tokens.color.primarySubtle,
          borderColor: tokens.color.border,
          boxShadow: "none",
          transform: "none",
          outline: `2px solid ${tokens.color.focusRing}`,
          outlineOffset: 1,
        },
      }}
    >
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: `${tokens.radius.control}px`,
          display: "grid",
          placeItems: "center",
          color: meta.color,
          bgcolor: meta.bg,
          "& svg": { fontSize: 12 },
        }}
      >
        {meta.icon}
      </Box>
      <Box minWidth={0}>
        <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: 11, lineHeight: 1.35 }}>
          {field.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "none", fontSize: 10 }}>
          {field.description}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9.5, lineHeight: 1.2 }}>
        {meta.label}
      </Typography>
    </Box>
  );
}

export default memo(DraggableField);
