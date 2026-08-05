import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const configPath = path.resolve(process.cwd(), "nginx.conf");
const composePath = path.resolve(process.cwd(), "docker-compose.yml");
const localComposePath = path.resolve(process.cwd(), "docker-compose.local.yml");
const indexPath = path.resolve(process.cwd(), "index.html");
const packagePath = path.resolve(process.cwd(), "package.json");
const workflowPath = path.resolve(process.cwd(), ".github/workflows/frontend-checks.yml");
const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
const dockerignorePath = path.resolve(process.cwd(), ".dockerignore");
const envExamplePath = path.resolve(process.cwd(), ".env.example");
const apiDockerfilePath = path.resolve(process.cwd(), "apps/api/Dockerfile");
const backupScriptPath = path.resolve(process.cwd(), "infrastructure/database/backup.ps1");
const restoreScriptPath = path.resolve(process.cwd(), "infrastructure/database/restore.ps1");

describe("nginx static frontend configuration", () => {
  it("does not ship built-in development credentials or login UI", () => {
    const compose = readFileSync(composePath, "utf8");
    expect(compose).not.toContain("DEVELOPMENT_AUTH_EMAIL");
    expect(compose).not.toContain("DEVELOPMENT_AUTH_PASSWORD");
    expect(compose).toContain("AUTH_MODE:");
    expect(compose).toContain("INTERNAL_SINGLE_USER_ID:");
  });

  it("applies security and cache headers from one inheritable server scope", () => {
    const config = readFileSync(configPath, "utf8");
    const locationBlocks = config.match(/location\s+[^{]+\{[^{}]*\}/g) ?? [];

    expect(config).toContain("map $uri $cache_control");
    expect(config).toContain('add_header Cache-Control "$cache_control" always;');
    expect(config).toContain('add_header Content-Security-Policy');
    expect(config).toContain('add_header X-Content-Type-Options "nosniff" always;');
    expect(locationBlocks.some((block) => block.includes("add_header"))).toBe(false);
  });

  it("proxies API requests to the backend instead of serving the SPA shell", () => {
    const config = readFileSync(configPath, "utf8");

    expect(config).toMatch(/location\s+=\s+\/api\s*\{[^}]*proxy_pass\s+http:\/\/backend:3000/m);
    expect(config).toMatch(/location\s+\^~\s+\/api\/\s*\{[^}]*proxy_pass\s+http:\/\/backend:3000/m);
    expect(config).toContain("server_name dash.triup-psu.space;");
    expect(config).toContain('location = /api/auth/callback');
    expect(config).toMatch(/location\s+=\s+\/api\/auth\/callback\s*\{[^}]*access_log\s+off;/m);
    expect(config).toContain('proxy_set_header X-User-Id "";');
    expect(config).toContain('proxy_set_header X-Role "";');
  });

  it("never falls back to SPA HTML inside the generated asset namespace", () => {
    const config = readFileSync(configPath, "utf8");

    expect(config).toMatch(/location\s+\^~\s+\/assets\/\s*\{[^}]*try_files\s+\$uri\s+=404/m);
  });

  it("keeps the default container binding local and requires an explicit host override", () => {
    const compose = readFileSync(composePath, "utf8");

    expect(compose).toContain('"${FRONTEND_HOST:-127.0.0.1}:${FRONTEND_PORT:-8080}:8080"');
  });

  it("uses a configurable local backend port that does not collide with common host services", () => {
    const localCompose = readFileSync(localComposePath, "utf8");

    expect(localCompose).toContain('"127.0.0.1:${BACKEND_HOST_PORT:-3001}:3000"');
  });

  it("serves only self-hosted scripts and fonts under the production CSP", () => {
    const config = readFileSync(configPath, "utf8");
    const index = readFileSync(indexPath, "utf8");

    expect(config).toMatch(/script-src 'self';/);
    expect(config).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(config).toMatch(/font-src 'self' data:;/);
    expect(index).not.toMatch(/<script>(?![^<]*type=)/);
    expect(index).not.toContain("fonts.googleapis.com");
    expect(index).not.toContain("fonts.gstatic.com");
  });

  it("runs both dependency audits in the authoritative local and CI gate", () => {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    const workflow = readFileSync(workflowPath, "utf8");

    expect(packageJson.scripts.check).toContain("npm audit");
    expect(packageJson.scripts["audit:prod"]).toBe("node scripts/security/audit-production.mjs");
    expect(packageJson.scripts["security:router-rsc"]).toBeUndefined();
    expect(packageJson.scripts.check).toContain("npm run audit:prod");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run check");
    expect(workflow).not.toMatch(/uses:\s+[^\s]+@v\d+/);
  });

  it("keeps the CI workflow required by the in-image quality gate in the Docker build context", () => {
    const dockerignore = readFileSync(dockerignorePath, "utf8");

    expect(dockerignore).not.toMatch(/^\.github\s*$/m);
    expect(dockerignore).toContain("!.github/workflows/frontend-checks.yml");
  });

  it("documents the standalone image API boundary as same-origin", () => {
    const envExample = readFileSync(envExamplePath, "utf8");

    expect(envExample).not.toContain("https://api.example.com");
    expect(envExample).toContain("same-origin");
    expect(envExample).toContain("VITE_EXTERNAL_SESSION_REQUIRED_URL");
  });

  it("pins container base images to immutable manifest digests", () => {
    const dockerfile = readFileSync(dockerfilePath, "utf8");
    const fromLines = dockerfile.split(/\r?\n/).filter((line) => line.startsWith("FROM "));

    expect(fromLines).toHaveLength(2);
    fromLines.forEach((line) => expect(line).toMatch(/@sha256:[a-f0-9]{64}\s+AS\s+/));
  });

  it("bounds proxied requests and blocks sensitive file namespaces", () => {
    const config = readFileSync(configPath, "utf8");

    expect(config).toMatch(/client_max_body_size\s+6m;/);
    expect(config).toMatch(/proxy_connect_timeout\s+\d+s;/);
    expect(config).toMatch(/location\s+~\s+\/\\\./);
    expect(config).toContain("location ~* \\.(?:bak|old|tmp|sql|map)$");
  });

  it("preserves client addresses for backend rate limiting", () => {
    const config = readFileSync(configPath, "utf8");
    const backendBootstrap = readFileSync(path.resolve(process.cwd(), "apps/api/src/app/bootstrap/create-application.ts"), "utf8");

    expect(config).toContain("proxy_set_header X-Real-IP $remote_addr;");
    expect(config).toContain("proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;");
    expect(backendBootstrap).toMatch(/trustProxy:\s*\[/);
  });

  it("runs application containers as non-root users", () => {
    const frontendDockerfile = readFileSync(dockerfilePath, "utf8");
    const apiDockerfile = readFileSync(apiDockerfilePath, "utf8");

    expect(frontendDockerfile).toMatch(/USER\s+nginx/);
    expect(apiDockerfile).toMatch(/USER\s+node/);
  });

  it("fails closed and restricts database backup files", () => {
    const backup = readFileSync(backupScriptPath, "utf8");
    const restore = readFileSync(restoreScriptPath, "utf8");

    expect(backup).toContain("SetAccessRuleProtection($true, $false)");
    expect(backup).toContain("Set-Acl -LiteralPath");
    expect(backup).toMatch(/LASTEXITCODE\s+-ne\s+0/);
    expect(restore).toMatch(/LASTEXITCODE\s+-ne\s+0/);
  });

  it("keeps the frontend off the database network", () => {
    const compose = readFileSync(composePath, "utf8");

    expect(compose).toMatch(/frontend:\s*[\s\S]*?networks:\s*\r?\n\s*- frontend_api/);
    expect(compose).toMatch(/postgres:\s*[\s\S]*?networks:\s*\r?\n\s*- backend_database/);
    expect(compose).toMatch(/backend_database:\s*\r?\n\s+internal:\s+true/);
  });
});
