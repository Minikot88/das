import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ADVISORY = "GHSA-qwww-vcr4-c8h2";
const exemptionCheck = fileURLToPath(new URL("./check-react-router-rsc-exemption.mjs", import.meta.url));

const architecture = spawnSync(process.execPath, [exemptionCheck], { encoding: "utf8" });
if (architecture.status !== 0) {
  process.stderr.write(architecture.stderr || architecture.stdout);
  process.exit(architecture.status || 1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("Run the production audit through npm so its CLI path is available.");
}

const audit = spawnSync(process.execPath, [npmCli, "audit", "--omit=dev", "--json"], {
  encoding: "utf8",
});
let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  process.stderr.write(audit.stderr || audit.stdout || audit.error?.message || "");
  throw new Error("npm audit did not return JSON.");
}

const highOrCritical = Object.values(report.vulnerabilities ?? {}).filter((entry) =>
  entry.severity === "high" || entry.severity === "critical",
);
const unapproved = highOrCritical.filter((entry) => {
  if (entry.name === "react-router-dom" && entry.via.includes("react-router")) return false;
  if (!["react-router", "react-router-dom"].includes(entry.name)) return true;
  return !entry.via.some((via) => typeof via === "object" && via.url?.endsWith(ADVISORY));
});

if (unapproved.length > 0) {
  throw new Error(`Production audit has unapproved High/Critical findings: ${unapproved.map((entry) => entry.name).join(", ")}`);
}

console.log(`Production audit gate passed: ${highOrCritical.length} temporary ${ADVISORY} finding(s), no other High/Critical findings.`);
