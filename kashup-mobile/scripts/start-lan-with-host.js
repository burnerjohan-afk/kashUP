/**
 * Lance Expo en mode LAN en injectant .env (IP packager + URL API).
 * Lit .env puis .env.local. Utilisez : npm run start:lan — après changement d'IP, relancer.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');

function readFromEnvFile(envPath, key) {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const match = trimmed.match(new RegExp('^' + key + '=(.+)$'));
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function readHostnameFromEnvFile(envPath) {
  const host = readFromEnvFile(envPath, 'REACT_NATIVE_PACKAGER_HOSTNAME');
  if (host) return host;
  const url = readFromEnvFile(envPath, 'EXPO_PUBLIC_API_URL');
  if (url) {
    try {
      const u = new URL(url);
      if (u.hostname && u.hostname !== 'localhost' && !u.hostname.endsWith('.vercel.app')) return u.hostname;
    } catch (_) {}
  }
  return null;
}

let hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;
if (!hostname) hostname = readHostnameFromEnvFile(path.join(root, '.env'));
if (!hostname) hostname = readHostnameFromEnvFile(path.join(root, '.env.local'));

let apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) apiUrl = readFromEnvFile(path.join(root, '.env'), 'EXPO_PUBLIC_API_URL');
if (!apiUrl) apiUrl = readFromEnvFile(path.join(root, '.env.local'), 'EXPO_PUBLIC_API_URL');

if (hostname) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
  console.log('Packager hostname:', hostname);
}
if (apiUrl) {
  process.env.EXPO_PUBLIC_API_URL = apiUrl;
  console.log('API URL:', apiUrl);
}

const env = { ...process.env };
if (hostname) env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
if (apiUrl) env.EXPO_PUBLIC_API_URL = apiUrl;

const child = spawn('npx', ['expo', 'start', '--lan'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code || 0));
