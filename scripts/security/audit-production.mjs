import { spawnSync } from "node:child_process";
import process from "node:process";

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
if (highOrCritical.length > 0) {
  throw new Error(`Production audit has High/Critical findings: ${highOrCritical.map((entry) => entry.name).join(", ")}`);
}

console.log("Production audit gate passed: no High/Critical findings.");
