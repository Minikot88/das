import React, { memo, useEffect, useMemo, useState } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DataObjectRoundedIcon from "@mui/icons-material/DataObjectRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { dashboardV2Tokens as tokens } from "@/components/dashboard-v2/theme";
import type { SqlExample, SqlQueryError, SqlQueryResult, SqlSavedQuery } from "@/components/dashboard-v2/sql/sqlQueryEngine";

type SqlTab = "query" | "results" | "saved";

type SqlQueryPanelProps = {
  open: boolean;
  query: string;
  result: SqlQueryResult | null;
  error: SqlQueryError | null;
  examples: SqlExample[];
  savedQueries: SqlSavedQuery[];
  isActiveDataset: boolean;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onRun: () => void;
  onFormat: () => void;
  onClear: () => void;
  onLoadExample: (exampleId: string) => void;
  onUseResult: () => void;
  onExportResultCsv: () => void;
  onCopyQuery: () => void;
  onSaveQuery: (name: string) => void;
  onLoadSaved: (queryId: string) => void;
  onRenameSaved: (queryId: string, name: string) => void;
  onDeleteSaved: (queryId: string) => void;
  onRunSaved: (queryId: string) => void;
};

function SqlQueryPanel({
  open,
  query,
  result,
  error,
  examples,
  savedQueries,
  isActiveDataset,
  onClose,
  onQueryChange,
  onRun,
  onFormat,
  onClear,
  onLoadExample,
  onUseResult,
  onExportResultCsv,
  onCopyQuery,
  onSaveQuery,
  onLoadSaved,
  onRenameSaved,
  onDeleteSaved,
  onRunSaved,
}: SqlQueryPanelProps) {
  const [tab, setTab] = useState<SqlTab>("query");
  const [selectedExampleId, setSelectedExampleId] = useState(examples[0]?.id ?? "");
  const [saveName, setSaveName] = useState("Custom Query");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const previewRows = result?.previewRows ?? [];
  const columns = result?.columns ?? [];
  const selectedExample = useMemo(
    () => examples.find((example) => example.id === selectedExampleId) ?? examples[0],
    [examples, selectedExampleId],
  );

  useEffect(() => {
    setRenameDrafts((current) =>
      savedQueries.reduce<Record<string, string>>((acc, item) => {
        acc[item.id] = current[item.id] ?? item.name;
        return acc;
      }, {}),
    );
  }, [savedQueries]);

  function runQuery() {
    onRun();
    setTab("results");
  }

  function loadExample() {
    if (!selectedExample) return;
    onLoadExample(selectedExample.id);
    setTab("query");
  }

  function runSavedQuery(queryId: string) {
    onRunSaved(queryId);
    setTab("results");
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: { xs: "100vw", sm: 620 },
          maxWidth: "100vw",
          height: "100dvh",
          borderLeft: "1px solid",
          borderColor: tokens.color.border,
          boxShadow: tokens.shadow.dialog,
          bgcolor: tokens.color.surface,
          display: "grid",
          gridTemplateRows: "auto auto minmax(0, 1fr)",
          transform: open ? "none !important" : undefined,
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: tokens.color.borderSubtle }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <StorageRoundedIcon sx={{ fontSize: 17, color: tokens.color.primary }} />
              <Typography variant="subtitle2" sx={{ fontSize: 14, fontWeight: 500 }} noWrap>
                SQL Query
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, fontSize: 11 }}>
              ทดลอง Query ชุดข้อมูลตัวอย่างแบบปลอดภัย โดยไม่เชื่อมต่อฐานข้อมูลจริง
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={onClose} sx={{ height: 30, px: 1.25 }}>
            Done
          </Button>
        </Stack>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value: SqlTab) => setTab(value)}
        variant="fullWidth"
        sx={{
          minHeight: 34,
          borderBottom: "1px solid",
          borderColor: tokens.color.borderSubtle,
          "& .MuiTab-root": {
            minHeight: 34,
            py: 0.5,
            fontSize: 12,
            fontWeight: 500,
            textTransform: "none",
          },
        }}
      >
        <Tab value="query" label="Query" />
        <Tab value="results" label="Results" />
        <Tab value="saved" label="Saved Queries" />
      </Tabs>

      <Box sx={{ minHeight: 0, overflow: "hidden" }}>
        {tab === "query" ? (
          <Stack spacing={1.25} sx={{ height: "100%", p: 2 }}>
            <Alert
              severity="info"
              variant="outlined"
              icon={<DataObjectRoundedIcon fontSize="small" />}
              sx={{
                borderRadius: `${tokens.radius.control}px`,
                py: 0.5,
                "& .MuiAlert-message": { fontSize: 12, lineHeight: 1.45 },
              }}
            >
              รองรับ SELECT, WHERE, GROUP BY, ORDER BY และ LIMIT จากตาราง sales_performance
            </Alert>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <Select
                size="small"
                value={selectedExampleId}
                onChange={(event) => setSelectedExampleId(event.target.value)}
                sx={{ height: 32, minWidth: 210, "& .MuiSelect-select": { py: 0.5, fontSize: 12 } }}
              >
                {examples.map((example) => (
                  <MenuItem key={example.id} value={example.id}>
                    {example.name}
                  </MenuItem>
                ))}
              </Select>
              <Button variant="outlined" size="small" onClick={loadExample} sx={{ height: 32 }}>
                Load Example
              </Button>
              {selectedExample ? (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
                  {selectedExample.description}
                </Typography>
              ) : null}
            </Stack>

            <TextField
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={"SELECT month, SUM(sales) AS total_sales\nFROM sales_performance\nGROUP BY month"}
              multiline
              minRows={12}
              maxRows={12}
              fullWidth
              sx={{
                flex: "0 0 auto",
                "& .MuiOutlinedInput-root": {
                  alignItems: "flex-start",
                  borderRadius: `${tokens.radius.control}px`,
                  bgcolor: "#FBFCFE",
                },
                "& textarea": {
                  fontFamily: '"IBM Plex Mono", Consolas, "Courier New", monospace',
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: tokens.color.text,
                },
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={runQuery} sx={{ height: 32 }}>
                Run Query
              </Button>
              <Button variant="outlined" onClick={onFormat} sx={{ height: 32 }}>
                Format SQL
              </Button>
              <Button variant="text" onClick={onClear} sx={{ height: 32 }}>
                Clear
              </Button>
              <Button
                variant="outlined"
                startIcon={<TableRowsRoundedIcon />}
                disabled={!result}
                title={result ? "ใช้ผลลัพธ์ SQL เป็นชุดข้อมูล" : "Run query ก่อนใช้ผลลัพธ์เป็นชุดข้อมูล"}
                onClick={onUseResult}
                sx={{ height: 32, ml: { sm: "auto" } }}
              >
                Use Result as Dataset
              </Button>
            </Stack>

            {error ? (
              <Alert severity="error" variant="outlined" sx={{ borderRadius: `${tokens.radius.control}px`, fontSize: 12 }}>
                {error.message}
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {tab === "results" ? (
          <Stack spacing={1.25} sx={{ height: "100%", p: 2, overflow: "hidden" }}>
            {error ? (
              <Alert severity="error" variant="outlined" sx={{ borderRadius: `${tokens.radius.control}px`, fontSize: 12 }}>
                {error.message}
              </Alert>
            ) : result ? (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 500 }}>
                      SQL Result
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.rowCount.toLocaleString("th-TH")} rows · {result.columns.length} fields · {result.executionMs} ms
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75}>
                    <Button variant="contained" size="small" onClick={onUseResult} sx={{ height: 30 }}>
                      {isActiveDataset ? "Dataset Active" : "Use Dataset"}
                    </Button>
                    <Tooltip title="Export raw SQL result">
                      <Button variant="outlined" size="small" startIcon={<DownloadRoundedIcon />} onClick={onExportResultCsv} sx={{ height: 30 }}>
                        CSV
                      </Button>
                    </Tooltip>
                    <Tooltip title="Copy query">
                      <Button variant="outlined" size="small" startIcon={<ContentCopyRoundedIcon />} onClick={onCopyQuery} sx={{ height: 30 }}>
                        Copy
                      </Button>
                    </Tooltip>
                  </Stack>
                </Stack>

                <TableContainer
                  sx={{
                    minHeight: 0,
                    flex: 1,
                    overflow: "auto",
                    border: "1px solid",
                    borderColor: tokens.color.border,
                    borderRadius: `${tokens.radius.control}px`,
                  }}
                >
                  <Table stickyHeader size="small" aria-label="SQL results">
                    <TableHead>
                      <TableRow>
                        {columns.map((column) => (
                          <TableCell key={column} sx={{ fontSize: 11, fontWeight: 500, bgcolor: tokens.color.surfaceMuted }}>
                            {column}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewRows.map((row, index) => (
                        <TableRow key={`${index}-${columns.map((column) => String(row[column])).join("-")}`}>
                          {columns.map((column) => (
                            <TableCell key={column} sx={{ fontSize: 11, color: tokens.color.textMuted }}>
                              {String(row[column] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {result.rowCount > result.previewRows.length ? (
                  <Typography variant="caption" color="text.secondary">
                    แสดงตัวอย่าง 100 แถวแรกจากผลลัพธ์ทั้งหมด
                  </Typography>
                ) : null}
              </>
            ) : (
              <EmptySqlState
                title="ยังไม่มีผลลัพธ์"
                description="รัน Query หรือโหลดตัวอย่างเพื่อดูผลลัพธ์และใช้เป็นชุดข้อมูล"
                actionLabel="Load Monthly Sales"
                onAction={() => {
                  onLoadExample("monthly-sales");
                  setTab("query");
                }}
              />
            )}
          </Stack>
        ) : null}

        {tab === "saved" ? (
          <Stack spacing={1.25} sx={{ height: "100%", p: 2, overflow: "auto" }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Query name"
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { height: 32 } }}
              />
              <Button
                variant="contained"
                startIcon={<SaveRoundedIcon />}
                onClick={() => onSaveQuery(saveName)}
                sx={{ height: 32 }}
              >
                Save Current
              </Button>
            </Stack>
            <Divider />
            {savedQueries.map((item) => (
              <Box
                key={item.id}
                sx={{
                  p: 1,
                  border: "1px solid",
                  borderColor: tokens.color.border,
                  borderRadius: `${tokens.radius.control}px`,
                  bgcolor: tokens.color.surface,
                }}
              >
                <Stack spacing={0.75}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={0.75} alignItems={{ sm: "center" }}>
                    <TextField
                      size="small"
                      value={renameDrafts[item.id] ?? item.name}
                      onChange={(event) =>
                        setRenameDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                      }
                      sx={{
                        flex: 1,
                        "& .MuiOutlinedInput-root": { height: 30 },
                        "& input": { fontSize: 12 },
                      }}
                    />
                    <Stack direction="row" spacing={0.5}>
                      <Button variant="outlined" size="small" onClick={() => onLoadSaved(item.id)} sx={{ height: 28 }}>
                        Load
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => runSavedQuery(item.id)} sx={{ height: 28 }}>
                        Run
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onRenameSaved(item.id, renameDrafts[item.id] ?? item.name)}
                        sx={{ height: 28 }}
                      >
                        Rename
                      </Button>
                      <Button color="error" variant="text" size="small" onClick={() => onDeleteSaved(item.id)} sx={{ height: 28 }}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      fontFamily: '"IBM Plex Mono", Consolas, "Courier New", monospace',
                      lineHeight: 1.45,
                    }}
                  >
                    {item.sql}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}

function EmptySqlState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        placeItems: "center",
        border: "1px dashed",
        borderColor: tokens.color.borderStrong,
        borderRadius: `${tokens.radius.control}px`,
        bgcolor: tokens.color.surfaceMuted,
        p: 3,
        textAlign: "center",
      }}
    >
      <Stack spacing={1} alignItems="center">
        <DataObjectRoundedIcon sx={{ fontSize: 28, color: tokens.color.primary }} />
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
        <Button variant="contained" size="small" onClick={onAction} sx={{ height: 30 }}>
          {actionLabel}
        </Button>
      </Stack>
    </Box>
  );
}

export default memo(SqlQueryPanel);
