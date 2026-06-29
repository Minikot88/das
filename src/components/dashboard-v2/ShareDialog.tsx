import React, { memo, useMemo } from "react";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type ShareAccess = "private" | "link" | "team";

type ManualCopyFallback = {
  label: string;
  text: string;
} | null;

type ShareDialogProps = {
  open: boolean;
  access: ShareAccess;
  copyFallback: ManualCopyFallback;
  onAccessChange: (access: ShareAccess) => void;
  onClose: () => void;
  onCopy: () => void;
  onCopyEmbed: () => void;
};

function ShareDialog({ open, access, copyFallback, onAccessChange, onClose, onCopy, onCopyEmbed }: ShareDialogProps) {
  const link = useMemo(() => (typeof window === "undefined" ? "" : window.location.href), []);
  const embedCode = `<iframe src="${link}" title="Mini BI Dashboard Designer" width="1200" height="720" loading="lazy"></iframe>`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="share-dashboard-v2-title">
      <DialogTitle id="share-dashboard-v2-title">แชร์แดชบอร์ด</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            เลือกระดับการเข้าถึงและคัดลอกลิงก์สำหรับเปิดหน้าเดโมนี้
          </Typography>
          <Select
            size="small"
            value={access}
            onChange={(event) => onAccessChange(event.target.value as ShareAccess)}
            aria-label="สิทธิ์การเข้าถึง"
          >
            <MenuItem value="private">ส่วนตัว</MenuItem>
            <MenuItem value="link">ผู้มีลิงก์</MenuItem>
            <MenuItem value="team">พื้นที่ทำงานทีม</MenuItem>
          </Select>
          {access === "team" ? (
            <Alert severity="info">
              โหมดทีมเป็นตัวอย่างสำหรับเดโม สิทธิ์จริงจะเชื่อมกับ RBAC ใน backend
            </Alert>
          ) : null}
          {copyFallback ? (
            <Alert severity="warning">
              เบราว์เซอร์บล็อกการคัดลอกอัตโนมัติ กรุณาคัดลอกข้อความด้านล่างด้วยตนเอง
            </Alert>
          ) : null}
          <TextField
            size="small"
            label="Share link"
            value={link}
            InputProps={{ readOnly: true }}
            onFocus={(event) => event.target.select()}
          />
          <TextField
            size="small"
            label="Embed code"
            value={embedCode}
            InputProps={{ readOnly: true }}
            multiline
            minRows={2}
            onFocus={(event) => event.target.select()}
          />
          {copyFallback ? (
            <TextField
              size="small"
              label={copyFallback.label}
              value={copyFallback.text}
              InputProps={{ readOnly: true }}
              multiline={copyFallback.text.length > 120}
              minRows={copyFallback.text.length > 120 ? 3 : 1}
              onFocus={(event) => event.target.select()}
              helperText="เลือกข้อความแล้วกด Ctrl+C หากปุ่มคัดลอกใช้งานไม่ได้"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>ปิด</Button>
        <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={onCopyEmbed}>
          คัดลอก Embed
        </Button>
        <Button variant="contained" startIcon={<ContentCopyRoundedIcon />} onClick={onCopy}>
          คัดลอกลิงก์
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default memo(ShareDialog);
