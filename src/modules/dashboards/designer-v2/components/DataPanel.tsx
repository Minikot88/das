import React, { memo, useMemo, useState } from "react";
import DatabaseRoundedIcon from "@mui/icons-material/StorageRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import { Box, Button, InputAdornment, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import DraggableField from "@modules/dashboards/designer-v2/components/DraggableField";
import { dashboardV2Tokens as tokens } from "@modules/dashboards/designer-v2/components/theme";
import type { DemoDatasource, DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import type { DataField } from "@modules/dashboards/designer-v2/components/types";

type DataPanelProps = {
  datasources: DemoDatasource[];
  schemaCatalog?: Array<{ schemaName: string; displayName: string; tables: Array<{ name: string; rowCountEstimate?: number }> }>;
  activeDatasourceId: string;
  fields: DataField[];
  rows: DemoDatasetRow[];
  searchValue: string;
  selectedTable: string;
  selectedFieldId: string | null;
  onSearchChange: (value: string) => void;
  onDatasourceChange: (datasourceId: string) => void;
  onSelectTable: (table: string) => void;
  onSelectField: (field: DataField) => void;
};

function ToggleIcon({ open }: { open: boolean }) {
  return open ? <ExpandMoreRoundedIcon fontSize="small" /> : <KeyboardArrowRightRoundedIcon fontSize="small" />;
}

function DataPanel({
  datasources,
  schemaCatalog = [],
  activeDatasourceId,
  fields,
  rows,
  searchValue,
  selectedTable,
  selectedFieldId,
  onSearchChange,
  onDatasourceChange,
  onSelectTable,
  onSelectField,
}: DataPanelProps) {
  const [openDatabase, setOpenDatabase] = useState(true);
  const [openSchema, setOpenSchema] = useState(true);
  const [openTable, setOpenTable] = useState(true);
  const [showAllFields, setShowAllFields] = useState(false);
  const datasource = datasources.find((item) => item.id === activeDatasourceId) ?? datasources[0] ?? {
    id: "",
    name: "ยังไม่มีชุดข้อมูล",
    database: "",
    schema: "",
    table: "",
    rowCount: 0,
    fieldCount: 0,
    lastUpdated: "",
  };

  const filteredFields = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return fields;
    return fields.filter((field) =>
      `${field.name} ${field.id} ${field.type} ${field.description}`.toLowerCase().includes(query)
    );
  }, [fields, searchValue]);
  const treeFields = searchValue.trim() || showAllFields ? filteredFields : filteredFields.slice(0, 10);
  const hasHiddenFields = !searchValue.trim() && filteredFields.length > treeFields.length;

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
        gridTemplateRows: "auto auto minmax(0, 1fr)",
        overflow: "hidden",
        boxShadow: "none",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="overline" color="text.secondary" fontWeight={500} sx={{ fontSize: 12, letterSpacing: ".04em", lineHeight: 1.25 }}>
          DATA
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
          ชุดข้อมูล ตาราง และฟิลด์
        </Typography>
      </Box>

      <Stack spacing={0.5} sx={{ px: 1, py: 0.75, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle }}>
        <TextField
          fullWidth
          size="small"
          value={searchValue}
          placeholder="ค้นหาฟิลด์..."
          onChange={(event) => onSearchChange(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 30,
              borderRadius: `${tokens.radius.control}px`,
              fontSize: 12,
            },
            "& .MuiInputBase-input": { py: 0.375 },
            "& .MuiInputBase-input::placeholder": {
              color: tokens.color.textMuted,
              opacity: 0.72,
              fontSize: 12,
            },
            "& .MuiSvgIcon-root": { fontSize: 16 },
          }}
        />
        <Select
          size="small"
          fullWidth
          value={datasources.some((item) => item.id === activeDatasourceId) ? activeDatasourceId : ""}
          disabled={!datasources.length}
          onChange={(event) => onDatasourceChange(event.target.value)}
          aria-label="เลือก datasource"
          sx={{
            height: 30,
            "& .MuiSelect-select": { py: 0.375, fontSize: 12 },
          }}
        >
          {datasources.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Box
        className="dashboard-v2-scrollarea"
        role="tree"
        aria-label="รายการฟิลด์ข้อมูล"
        sx={{
          minHeight: 0,
          overflow: "auto",
          px: 1.25,
          py: 0.5,
          "& .MuiTypography-body2": { fontSize: 11 },
          "& .MuiTypography-caption": { fontSize: 10 },
          "& .MuiSvgIcon-root": { fontSize: 16 },
        }}
      >
        <Stack spacing={0.125}>
          <Box
            component="button"
            type="button"
            onClick={() => setOpenDatabase((value) => !value)}
            aria-expanded={openDatabase}
            sx={{
              appearance: "none",
              border: 0,
              bgcolor: "transparent",
              width: "100%",
              minHeight: 24,
              px: 0.75,
              py: 0,
              display: "grid",
              gridTemplateColumns: "14px 16px minmax(0, 1fr)",
              alignItems: "center",
              gap: 0.75,
              textAlign: "left",
              color: "text.secondary",
              borderRadius: `${tokens.radius.control}px`,
              cursor: "pointer",
              "&:hover": { bgcolor: tokens.color.primarySubtle },
            }}
          >
            <ToggleIcon open={openDatabase} />
            <DatabaseRoundedIcon fontSize="small" />
            <Typography variant="body2" fontWeight={500} noWrap>
              {datasource.database}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "none" }}>
              {rows.length}
            </Typography>
          </Box>

          {openDatabase ? (
            <Box sx={{ pl: 1.75 }}>
              {schemaCatalog.map((schema) => (
                <Box key={schema.schemaName} sx={{ mb: 0.5 }}>
                  <Stack direction="row" alignItems="center" gap={0.75} sx={{ minHeight: 24, px: 0.75, color: "text.secondary" }}>
                    <TableChartRoundedIcon fontSize="small" />
                    <Typography variant="body2" fontWeight={500} noWrap>{schema.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: "auto" }}>{schema.tables.length}</Typography>
                  </Stack>
                  <Box sx={{ pl: 1.75, display: "grid", gap: 0.125 }}>
                    {schema.tables.map((table) => {
                      const activeTable = schema.schemaName === datasource.schema && table.name === datasource.table;
                      return (
                        <Box key={table.name} component="button" type="button" onClick={() => { if (activeTable) onSelectTable(table.name); }} aria-current={activeTable ? "true" : undefined} sx={{ appearance: "none", border: "1px solid", borderColor: activeTable ? tokens.color.selectedBorder : "transparent", borderLeft: `2px solid ${activeTable ? tokens.color.primary : "transparent"}`, bgcolor: activeTable ? tokens.color.selectedSurface : "transparent", minHeight: 24, px: 0.75, display: "grid", gridTemplateColumns: "16px minmax(0, 1fr) auto", alignItems: "center", gap: 0.75, textAlign: "left", color: "text.primary", borderRadius: `${tokens.radius.control}px`, cursor: activeTable ? "pointer" : "default" }}>
                          <TableChartRoundedIcon color={activeTable ? "primary" : "inherit"} fontSize="small" />
                          <Typography variant="body2" fontWeight={activeTable ? 600 : 400} noWrap>{table.name}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{Number(table.rowCountEstimate ?? 0).toLocaleString("th-TH")}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
              <Box
                component="button"
                type="button"
                onClick={() => setOpenSchema((value) => !value)}
                aria-expanded={openSchema}
                sx={{
                  appearance: "none",
                  border: 0,
                  bgcolor: "transparent",
                  width: "100%",
                  minHeight: 24,
                  px: 0.75,
                  display: "grid",
                  gridTemplateColumns: "14px 16px minmax(0, 1fr)",
                  alignItems: "center",
                  gap: 0.75,
                  textAlign: "left",
                  color: "text.secondary",
                  borderRadius: `${tokens.radius.control}px`,
                  cursor: "pointer",
                  "&:hover": { bgcolor: tokens.color.primarySubtle },
                }}
              >
                <ToggleIcon open={openSchema} />
                <TableChartRoundedIcon fontSize="small" />
                <Typography variant="body2" fontWeight={500} noWrap>
                  {datasource.schema}
                </Typography>
              </Box>

              {openSchema ? (
                <Box sx={{ pl: 1.75 }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => {
                      onSelectTable(datasource.table);
                      setOpenTable((value) => !value);
                    }}
                    aria-expanded={openTable}
                    aria-selected={selectedTable === datasource.table}
                    sx={{
                      appearance: "none",
                      width: "100%",
                      minHeight: 24,
                      px: 0.75,
                      border: "1px solid",
                      borderColor: selectedTable === datasource.table ? tokens.color.selectedBorder : "transparent",
                      borderLeft: `2px solid ${selectedTable === datasource.table ? tokens.color.primary : "transparent"}`,
                      bgcolor: selectedTable === datasource.table ? tokens.color.selectedSurface : "transparent",
                      display: "grid",
                      gridTemplateColumns: "14px 16px minmax(0, 1fr)",
                      alignItems: "center",
                      gap: 0.75,
                      textAlign: "left",
                      color: "text.primary",
                      borderRadius: `${tokens.radius.control}px`,
                      cursor: "pointer",
                      "&:hover": { bgcolor: tokens.color.primarySubtle },
                    }}
                  >
                    <ToggleIcon open={openTable} />
                    <TableChartRoundedIcon color="primary" fontSize="small" />
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {datasource.table}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "none" }}>
                      {filteredFields.length}
                    </Typography>
                  </Box>

                  {openTable ? (
                    <Box sx={{ pt: 0.25, pl: 1 }}>
                      {filteredFields.length ? (
                        treeFields.map((field) => (
                          <DraggableField
                            key={field.id}
                            field={field}
                            selected={selectedFieldId === field.id}
                            onSelect={onSelectField}
                          />
                        ))
                      ) : (
                        <Box
                          sx={{
                            p: 1.5,
                            border: "1px dashed",
                            borderColor: tokens.color.border,
                            color: "text.secondary",
                            textAlign: "center",
                            fontSize: 12,
                          }}
                        >
                          ไม่พบฟิลด์ที่ค้นหา
                        </Box>
                      )}
                      {hasHiddenFields || showAllFields ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setShowAllFields((value) => !value)}
                          sx={{ mt: 0.5, height: 24, minHeight: 24, px: 0.75, fontSize: 10, lineHeight: 1.2 }}
                        >
                          {showAllFields ? "แสดงน้อยลง" : `แสดงทั้งหมด (${filteredFields.length})`}
                        </Button>
                      ) : null}
                    </Box>
                  ) : null}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Stack>
      </Box>

    </Paper>
  );
}

export default memo(DataPanel);
