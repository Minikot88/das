const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.env.DASHBOARDMINI_ROOT || '/home/ubuntu/infra/projects/dashboardmini';
const sharedRoot = path.join(projectRoot, 'shared');
const envPath = path.join(projectRoot, 'shared/backend.env');

function readEnvironment(file) {
  return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap(line => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return [];
    const separator = value.indexOf('=');
    if (separator < 1) return [];
    return [[value.slice(0, separator), value.slice(separator + 1)]];
  }));
}

module.exports = {
  apps: [{
    name: 'dashboardmini-api',
    cwd: path.join(projectRoot, 'current', 'apps', 'api'),
    script: 'dist/main.js',
    interpreter: process.execPath,
    instances: 1,
    exec_mode: 'fork',
    env: readEnvironment(envPath),
    max_memory_restart: '768M',
    restart_delay: 3000,
    kill_timeout: 15000,
    listen_timeout: 15000,
    time: true,
    out_file: path.join(sharedRoot, 'logs', 'api-out.log'),
    error_file: path.join(sharedRoot, 'logs', 'api-error.log'),
    merge_logs: true,
  }],
};
