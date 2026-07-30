import React, { useState } from "react";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import type { DataField, DatasetJoin, DatasetTable } from "./types";

const semanticTypes = [
  "category", "quantity", "currency", "percentage", "date", "year",
  "boolean", "location",
] as const;

type Props = {
  tables: DatasetTable[];
  joins: DatasetJoin[];
  fields: DataField[];
  queryPreview: { sql: string; durationMs: number } | null;
  onSetJoin: (join: DatasetJoin) => void;
  onRemoveTable: (alias: string) => void;
  onSemanticTypeChange: (fieldId: string, semanticType: string) => void;
  safeCasts: Record<string, string>;
  onSafeCastChange: (fieldId: string, targetType: string) => void;
  onAddCalculatedField: (calculated: Record<string, unknown>) => void;
};

export default function MultiTableContext({
  tables,
  joins,
  fields,
  queryPreview,
  onSetJoin,
  onRemoveTable,
  onSemanticTypeChange,
  safeCasts,
  onSafeCastChange,
  onAddCalculatedField,
}: Props) {
  const unjoined = tables.slice(1).find((table) => !joins.some((join) => join.left.alias === table.alias || join.right.alias === table.alias));
  const [leftAlias, setLeftAlias] = useState("");
  const [leftColumn, setLeftColumn] = useState("");
  const [rightColumn, setRightColumn] = useState("");
  const [joinType, setJoinType] = useState<"inner" | "left">("left");
  const [contextExpandedOverride, setContextExpandedOverride] = useState<boolean | null>(null);
  const contextExpanded = contextExpandedOverride ?? tables.length > 1;
  const [typesExpanded, setTypesExpanded] = useState(false);
  const [calculatedExpanded, setCalculatedExpanded] = useState(false);
  const [calculatedName, setCalculatedName] = useState("");
  const [calculatedKind, setCalculatedKind] = useState("ratio");
  const [calculatedLeft, setCalculatedLeft] = useState("");
  const [calculatedRight, setCalculatedRight] = useState("");
  const leftTables = tables.filter((table) => table.alias !== unjoined?.alias);
  const activeLeft = leftTables.find((table) => table.alias === leftAlias) ?? leftTables[0];
  const leftFields = fields.filter((field) => field.sourceAlias === activeLeft?.alias);
  const rightFields = fields.filter((field) => field.sourceAlias === unjoined?.alias);

  if (!tables.length) return null;

  const addJoin = () => {
    if (!activeLeft || !unjoined || !leftColumn || !rightColumn) return;
    onSetJoin({
      left: { ...activeLeft, column: leftColumn },
      right: { ...unjoined, column: rightColumn },
      operator: "eq",
      joinType,
      automatic: false,
    });
  };
  const fieldReference = (fieldId: string) => {
    const field = fields.find((item) => item.id === fieldId);
    return field ? { tableAlias: field.sourceAlias, column: field.label.split(".").at(-1) } : null;
  };
  const addCalculated = () => {
    const left = fieldReference(calculatedLeft);
    const right = fieldReference(calculatedRight);
    if (!calculatedName || !left) return;
    const expression = calculatedKind === "ratio" && right
      ? { kind: "ratio", numerator: left, denominator: right }
      : calculatedKind === "arithmetic" && right
        ? { kind: "arithmetic", operator: "add", left, right }
        : calculatedKind === "concat" && right
          ? { kind: "concat", fields: [left, right], separator: " " }
          : calculatedKind === "case"
            ? { kind: "case", field: left, operator: "eq", value: true, then: "ใช่", else: "ไม่ใช่" }
            : calculatedKind === "countDistinct"
              ? { kind: "countDistinct", field: left }
              : { kind: "datePart", part: "year", field: left };
    onAddCalculatedField({
      name: calculatedName,
      resultType: calculatedKind === "concat" || calculatedKind === "case" ? "text" : "number",
      expression,
    });
    setCalculatedName("");
  };

  return (
    <Paper variant="outlined" aria-label="ตารางที่ใช้" sx={{ mb: 1, flex: "0 0 auto", overflow: "hidden" }}>
      <Accordion disableGutters elevation={0} expanded={contextExpanded} onChange={(_, expanded) => setContextExpandedOverride(expanded)}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} aria-controls="multi-table-context-content">
          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
            <LinkRoundedIcon color="primary" fontSize="small" />
            <Typography fontWeight={700} fontSize={12}>ตารางที่ใช้</Typography>
            <Chip size="small" label={`${tables.length}/6 ตาราง`} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {joins.length ? `${joins.length} Join` : "Base table"}
            </Typography>
          </Stack>
        </AccordionSummary>
        {contextExpanded ? <AccordionDetails id="multi-table-context-content" sx={{ pt: 0 }}>
          <Stack spacing={1}>
            {tables.map((table, index) => (
              <Stack key={table.alias} direction="row" alignItems="center" spacing={1}>
                <Typography variant="body2" sx={{ minWidth: 0, flex: 1 }} noWrap>
                  {table.schema}.{table.table} <Typography component="span" color="text.secondary">as {table.alias}</Typography>
                </Typography>
                <Chip size="small" label={index === 0 ? "Base" : "Joined"} color={index === 0 ? "primary" : "default"} variant="outlined" />
                <Tooltip title={index === 0 ? "Base Table ลบไม่ได้" : "ลบได้เมื่อไม่มี Mapping อ้างถึง"}>
                  <span>
                    <IconButton size="small" disabled={index === 0} aria-label={`ลบตาราง ${table.alias}`} onClick={() => onRemoveTable(table.alias)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}

            {joins.map((join) => (
              <Alert key={`${join.left.alias}-${join.right.alias}`} severity="success" icon={<LinkRoundedIcon />} sx={{ py: 0 }}>
                {join.left.alias}.{join.left.column} = {join.right.alias}.{join.right.column} · {join.joinType.toUpperCase()} JOIN
                {join.automatic ? " · แนะนำจาก FK" : " · กำหนดเอง"}
              </Alert>
            ))}

            {unjoined ? (
              <Box role="group" aria-label={`Manual Join สำหรับ ${unjoined.alias}`}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  ตาราง {unjoined.alias} ยังไม่มีเงื่อนไข Join กรุณาเลือกคอลัมน์ที่มี Physical Type เข้ากันได้
                </Alert>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                  <FormControl size="small">
                    <InputLabel id="join-left-table-label">Left table</InputLabel>
                    <Select labelId="join-left-table-label" label="Left table" value={activeLeft?.alias ?? ""} onChange={(event) => { setLeftAlias(event.target.value); setLeftColumn(""); }}>
                      {leftTables.map((table) => <MenuItem key={table.alias} value={table.alias}>{table.alias}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel id="join-left-column-label">Left column</InputLabel>
                    <Select labelId="join-left-column-label" label="Left column" value={leftColumn} onChange={(event) => setLeftColumn(event.target.value)}>
                      {leftFields.map((field) => <MenuItem key={field.id} value={field.label.split(".").at(-1)}>{field.label} · {field.physicalType}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel id="join-right-column-label">Right column</InputLabel>
                    <Select labelId="join-right-column-label" label="Right column" value={rightColumn} onChange={(event) => setRightColumn(event.target.value)}>
                      {rightFields.map((field) => <MenuItem key={field.id} value={field.label.split(".").at(-1)}>{field.label} · {field.physicalType}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel id="join-type-label">Join type</InputLabel>
                    <Select labelId="join-type-label" label="Join type" value={joinType} onChange={(event) => setJoinType(event.target.value as "inner" | "left")}>
                      <MenuItem value="left">LEFT JOIN</MenuItem>
                      <MenuItem value="inner">INNER JOIN</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Button sx={{ mt: 1 }} size="small" variant="contained" disabled={!leftColumn || !rightColumn} onClick={addJoin}>ตรวจสอบและใช้ Join</Button>
              </Box>
            ) : null}

            <Accordion disableGutters elevation={0} expanded={typesExpanded} onChange={(_, expanded) => setTypesExpanded(expanded)}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="caption" fontWeight={700}>Physical / Semantic Type</Typography>
              </AccordionSummary>
              {typesExpanded ? <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 0.75 }}>
                  {fields.map((field) => (
                    <Stack key={field.id} direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                      <Box minWidth={0} flex={1}>
                        <Typography variant="caption" fontWeight={600} noWrap>{field.label}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" noWrap>
                          {field.physicalType || field.type}{field.isPrimaryKey ? " · PK" : ""}{field.foreignKeys?.length ? " · FK" : ""}{field.nullable ? " · nullable" : ""}
                        </Typography>
                      </Box>
                      <Select size="small" aria-label={`Semantic Type ของ ${field.label}`} value={field.semanticType} onChange={(event) => onSemanticTypeChange(field.id, event.target.value)} sx={{ minWidth: 110, fontSize: 11 }}>
                        {semanticTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                      </Select>
                      <Select
                        size="small"
                        aria-label={`Safe Cast ของ ${field.label}`}
                        value={safeCasts[`${field.sourceAlias}.${field.label.split(".").at(-1)}`] || "none"}
                        onChange={(event) => onSafeCastChange(field.id, event.target.value)}
                        sx={{ minWidth: 92, fontSize: 11 }}
                      >
                        <MenuItem value="none">ไม่ Cast</MenuItem>
                        <MenuItem value="text">Text</MenuItem>
                        <MenuItem value="numeric">Number</MenuItem>
                        <MenuItem value="date">Date</MenuItem>
                      </Select>
                    </Stack>
                  ))}
                </Box>
              </AccordionDetails> : null}
            </Accordion>

            <Accordion disableGutters elevation={0} expanded={calculatedExpanded} onChange={(_, expanded) => setCalculatedExpanded(expanded)}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="caption" fontWeight={700}>Calculated Field</Typography>
              </AccordionSummary>
              {calculatedExpanded ? <AccordionDetails sx={{ p: 0 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr 1fr auto" }, gap: 0.75 }}>
                  <TextField size="small" label="Name" value={calculatedName} onChange={(event) => setCalculatedName(event.target.value.replace(/[^A-Za-z0-9_]/g, "_"))} />
                  <FormControl size="small">
                    <InputLabel id="calculated-kind-label">Expression</InputLabel>
                    <Select labelId="calculated-kind-label" label="Expression" value={calculatedKind} onChange={(event) => setCalculatedKind(event.target.value)}>
                      <MenuItem value="ratio">Ratio / Percentage</MenuItem>
                      <MenuItem value="arithmetic">Arithmetic (+)</MenuItem>
                      <MenuItem value="datePart">Date part (Year)</MenuItem>
                      <MenuItem value="concat">Concatenate</MenuItem>
                      <MenuItem value="case">CASE (Boolean)</MenuItem>
                      <MenuItem value="countDistinct">Count distinct</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small">
                    <InputLabel id="calculated-left-label">Field A</InputLabel>
                    <Select labelId="calculated-left-label" label="Field A" value={calculatedLeft} onChange={(event) => setCalculatedLeft(event.target.value)}>
                      {fields.filter((field) => field.sourceAlias).map((field) => <MenuItem key={field.id} value={field.id}>{field.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl size="small" disabled={["datePart", "case", "countDistinct"].includes(calculatedKind)}>
                    <InputLabel id="calculated-right-label">Field B</InputLabel>
                    <Select labelId="calculated-right-label" label="Field B" value={calculatedRight} onChange={(event) => setCalculatedRight(event.target.value)}>
                      {fields.filter((field) => field.sourceAlias).map((field) => <MenuItem key={field.id} value={field.id}>{field.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button size="small" variant="outlined" disabled={!calculatedName || !calculatedLeft || (!["datePart", "case", "countDistinct"].includes(calculatedKind) && !calculatedRight)} onClick={addCalculated}>
                    เพิ่ม
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary">Expression ถูกส่งเป็นโครงสร้างที่ Backend ตรวจสอบ; ไม่รับ Raw SQL</Typography>
              </AccordionDetails> : null}
            </Accordion>

            {queryPreview ? (
              <Box>
                <Typography variant="caption" fontWeight={700}>SQL Preview · อ่านอย่างเดียว · {queryPreview.durationMs} ms</Typography>
                <Box component="pre" tabIndex={0} aria-label="SQL Preview แบบอ่านอย่างเดียว" sx={{ m: 0, mt: 0.5, p: 1, bgcolor: "grey.900", color: "grey.100", borderRadius: 1, overflow: "auto", maxHeight: 100, fontSize: 10 }}>
                  {queryPreview.sql}
                </Box>
              </Box>
            ) : null}
          </Stack>
        </AccordionDetails> : null}
      </Accordion>
    </Paper>
  );
}
