import React, { memo, useMemo, useState } from "react";
import AbcRoundedIcon from "@mui/icons-material/AbcRounded";
import DatabaseRoundedIcon from "@mui/icons-material/StorageRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import { Box, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import DraggableField from "@modules/dashboards/designer-v2/components/DraggableField";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { DemoDatasource, DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import type { DataField, DatasetTable } from "@modules/dashboards/designer-v2/components/types";

type SchemaCatalogEntry = {
  schemaName: string;
  displayName: string;
  tables: Array<{ name: string; rowCountEstimate?: number }>;
};

type DataPanelProps = {
  datasources: DemoDatasource[];
  schemaCatalog?: SchemaCatalogEntry[];
  activeDatasourceId: string;
  fields: DataField[];
  rows: DemoDatasetRow[];
  searchValue: string;
  selectedTable: string;
  selectedFieldId: string | null;
  selectedTables?: DatasetTable[];
  onSearchChange: (value: string) => void;
  onDatasourceChange?: (datasourceId: string) => void;
  onSelectTable: (schemaName: string, tableName: string) => void;
  onSelectField: (field: DataField) => void;
};

function ToggleIcon({ open }: { open: boolean }) {
  return open ? <ExpandMoreRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />;
}

const rowSx = {
  appearance: "none",
  width: "100%",
  minHeight: 25,
  px: 0.625,
  py: 0,
  border: "1px solid transparent",
  bgcolor: "transparent",
  display: "grid",
  gridTemplateColumns: "14px 16px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 0.625,
  textAlign: "left",
  color: "text.primary",
  "@media (max-width: 899px)": {
    minHeight: 36,
    py: 0.25,
  },
  borderRadius: `${tokens.radius.control}px`,
  cursor: "pointer",
  "&:hover": { bgcolor: tokens.color.primarySubtle },
  "&:focus-visible": {
    outline: `2px solid ${tokens.color.focusRing}`,
    outlineOffset: -1,
  },
} as const;

function DataPanel({
  datasources,
  schemaCatalog = [],
  activeDatasourceId,
  fields,
  rows,
  searchValue,
  selectedTable,
  selectedFieldId,
  selectedTables = [],
  onSearchChange,
  onSelectTable,
  onSelectField,
}: DataPanelProps) {
  const datasource = datasources.find((item) => item.id === activeDatasourceId) ?? datasources[0] ?? {
    id: "",
    name: "ยังไม่มีชุดข้อมูล",
    database: "PostgreSQL",
    schema: "",
    table: "",
    rowCount: 0,
    fieldCount: 0,
    lastUpdated: "",
  };
  const [openNodes, setOpenNodes] = useState<Set<string>>(() => new Set(["connection", "database"]));
  const normalizedSearch = searchValue.trim().toLowerCase();

  const filteredFields = useMemo(() => {
    if (!normalizedSearch) return fields;
    return fields.filter((field) =>
      `${field.name} ${field.id} ${field.type} ${field.description} ${datasource.schema}.${datasource.table}`.toLowerCase().includes(normalizedSearch)
    );
  }, [datasource.schema, datasource.table, fields, normalizedSearch]);

  const catalog = useMemo(() => {
    if (!normalizedSearch) return schemaCatalog;
    return schemaCatalog
      .map((schema) => ({
        ...schema,
        tables: schema.tables.filter((table) => {
          if (`${schema.schemaName}.${table.name}`.toLowerCase().includes(normalizedSearch)) return true;
          return schema.schemaName === datasource.schema
            && table.name === datasource.table
            && filteredFields.length > 0;
        }),
      }))
      .filter((schema) => schema.tables.length || schema.schemaName.toLowerCase().includes(normalizedSearch));
  }, [datasource.schema, datasource.table, filteredFields.length, normalizedSearch, schemaCatalog]);

  function toggleNode(id: string) {
    setOpenNodes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Paper
      data-testid="dashboard-v2-data-panel"
      elevation={0}
      sx={{
        height: "100%",
        minHeight: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
        display: "grid",
        gridTemplateRows: "auto auto minmax(0, 1fr) auto",
        overflow: "hidden",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="overline" color="primary.main" fontWeight={600} sx={{ fontSize: 12, letterSpacing: ".04em", lineHeight: 1.25 }}>
          DATA
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
          ชุดข้อมูล ตาราง และฟิลด์
        </Typography>
      </Box>

      <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle }}>
        <TextField
          fullWidth
          size="small"
          value={searchValue}
          placeholder="ค้นหา table หรือ field"
          onChange={(event) => onSearchChange(event.target.value)}
          inputProps={{ "aria-label": "ค้นหา table หรือ field" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 31,
              borderRadius: `${tokens.radius.control}px`,
              fontSize: 11,
            },
            "& .MuiInputBase-input": { py: 0.375 },
            "& .MuiSvgIcon-root": { fontSize: 16 },
          }}
        />
      </Box>

      <Box
        className="dashboard-v2-scrollarea"
        role="tree"
        aria-label="รายการฟิลด์ข้อมูล"
        sx={{
          minHeight: 0,
          overflow: "auto",
          px: 0.75,
          py: 0.625,
          "& .MuiTypography-body2": { fontSize: 11 },
          "& .MuiTypography-caption": { fontSize: 9.5 },
          "& .MuiSvgIcon-root": { fontSize: 15 },
        }}
      >
        <Stack spacing={0.125}>
          <Box component="button" type="button" onClick={() => toggleNode("connection")} aria-expanded={openNodes.has("connection")} sx={rowSx}>
            <ToggleIcon open={openNodes.has("connection")} />
            <DatabaseRoundedIcon color="primary" />
            <Typography variant="body2" fontWeight={600} noWrap>Application PostgreSQL</Typography>
          </Box>

          {openNodes.has("connection") ? (
            <Box sx={{ pl: 1.5 }}>
              <Box component="button" type="button" onClick={() => toggleNode("database")} aria-expanded={openNodes.has("database")} sx={rowSx}>
                <ToggleIcon open={openNodes.has("database")} />
                <DatabaseRoundedIcon />
                <Typography variant="body2" fontWeight={500} noWrap>{datasource.database || "PostgreSQL"}</Typography>
              </Box>

              {openNodes.has("database") ? (
                <Box sx={{ pl: 1.5 }}>
                  {catalog.map((schema) => {
                    const schemaId = `schema:${schema.schemaName}`;
                    const tablesId = `tables:${schema.schemaName}`;
                    return (
                      <Box key={schema.schemaName}>
                        <Box component="button" type="button" onClick={() => toggleNode(schemaId)} aria-expanded={openNodes.has(schemaId)} sx={rowSx}>
                          <ToggleIcon open={openNodes.has(schemaId)} />
                          <FolderRoundedIcon sx={{ color: tokens.color.warning }} />
                          <Typography variant="body2" fontWeight={500} noWrap>{schema.displayName || schema.schemaName}</Typography>
                        </Box>
                        {openNodes.has(schemaId) ? (
                          <Box sx={{ pl: 1.5 }}>
                            <Box component="button" type="button" onClick={() => toggleNode(tablesId)} aria-expanded={openNodes.has(tablesId)} sx={rowSx}>
                              <ToggleIcon open={openNodes.has(tablesId)} />
                              <TableChartRoundedIcon />
                              <Typography variant="body2" noWrap>Tables</Typography>
                              <Typography variant="caption" color="text.secondary">{schema.tables.length}</Typography>
                            </Box>
                            {openNodes.has(tablesId) ? (
                              <Box sx={{ pl: 1.5 }}>
                                {schema.tables.map((table) => {
                                  const selectedTableEntry = selectedTables.find((item) => item.schema === schema.schemaName && item.table === table.name);
                                  const active = Boolean(selectedTableEntry) || (schema.schemaName === datasource.schema && table.name === datasource.table);
                                  const tableFields = fields.filter((field) =>
                                    field.sourceSchema && field.sourceTable
                                      ? field.sourceSchema === schema.schemaName && field.sourceTable === table.name
                                      : schema.schemaName === datasource.schema && table.name === datasource.table);
                                  const tableId = `table:${schema.schemaName}.${table.name}`;
                                  const columnsId = `columns:${schema.schemaName}.${table.name}`;
                                  const knownEstimate = Number.isFinite(Number(table.rowCountEstimate)) && Number(table.rowCountEstimate) >= 0;
                                  return (
                                    <Box key={table.name}>
                                      <Box
                                        component="button"
                                        type="button"
                                        aria-label={table.name}
                                        aria-current={active ? "true" : undefined}
                                        aria-expanded={active ? openNodes.has(tableId) : undefined}
                                        onClick={() => {
                                          onSelectTable(schema.schemaName, table.name);
                                          if (active) {
                                            toggleNode(tableId);
                                          } else {
                                            setOpenNodes((current) => new Set([
                                              ...current,
                                              tableId,
                                              `columns:${schema.schemaName}.${table.name}`,
                                            ]));
                                          }
                                        }}
                                        sx={{
                                          ...rowSx,
                                          borderColor: active ? tokens.color.selectedBorder : "transparent",
                                          borderLeft: `2px solid ${active ? tokens.color.primary : "transparent"}`,
                                          bgcolor: active ? tokens.color.selectedSurface : "transparent",
                                          color: active ? "primary.main" : "text.primary",
                                        }}
                                      >
                                        <ToggleIcon open={active && openNodes.has(tableId)} />
                                        <TableChartRoundedIcon color={active ? "primary" : "inherit"} />
                                        <Typography variant="body2" fontWeight={active ? 600 : 400} noWrap>{table.name}</Typography>
                                        <Typography variant="caption" color="text.secondary" aria-hidden="true">
                                          {knownEstimate ? Number(table.rowCountEstimate).toLocaleString("th-TH") : "—"}
                                        </Typography>
                                      </Box>
                                      {active && openNodes.has(tableId) ? (
                                        <Box sx={{ pl: 1.5 }}>
                                          <Box component="button" type="button" onClick={() => toggleNode(columnsId)} aria-expanded={openNodes.has(columnsId)} sx={rowSx}>
                                            <ToggleIcon open={openNodes.has(columnsId)} />
                                            <AbcRoundedIcon />
                                            <Typography variant="body2" noWrap>Columns</Typography>
                                            <Typography variant="caption" color="text.secondary">{tableFields.length}</Typography>
                                          </Box>
                                          {openNodes.has(columnsId) ? (
                                            <Box sx={{ pl: 1.25, pt: 0.125 }}>
                                              {tableFields.length ? tableFields.filter((field) => filteredFields.some((item) => item.id === field.id)).map((field) => (
                                                <DraggableField
                                                  key={field.id}
                                                  field={field}
                                                  selected={selectedFieldId === field.id}
                                                  onSelect={onSelectField}
                                                />
                                              )) : (
                                                <Box sx={{ px: 1, py: 1.5, color: "text.secondary", fontSize: 11, textAlign: "center" }}>
                                                  ไม่พบ field ที่ค้นหา
                                                </Box>
                                              )}
                                            </Box>
                                          ) : null}
                                        </Box>
                                      ) : null}
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    );
                  })}
                  {!catalog.length ? (
                    <Box sx={{ p: 1.5, color: "text.secondary", textAlign: "center", fontSize: 11 }}>
                      ไม่พบ table หรือ field
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ px: 1, py: 0.75, borderTop: "1px solid", borderColor: "divider", bgcolor: tokens.color.surfaceMuted }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 16, height: 16, display: "grid", placeItems: "center", borderRadius: "50%", color: "primary.main", bgcolor: tokens.color.primarySoft, fontSize: 10, fontWeight: 700 }}>i</Box>
          <Box minWidth={0}>
            <Typography variant="caption" color="text.primary" sx={{ display: "block", fontSize: 10.5, fontWeight: 600 }}>
              {selectedTables.length > 1 ? `${selectedTables.length} ตารางใน Dataset` : "เลือกเพิ่มได้สูงสุด 6 ตาราง"}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", fontSize: 9.5 }}>
              {selectedTable ? `${datasource.schema}.${selectedTable} · ${rows.length.toLocaleString("th-TH")} แถวที่โหลด` : "เลือก table เพื่อดู fields"}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
}

export default memo(DataPanel);
