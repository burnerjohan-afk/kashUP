/**
 * Lance Expo en mode LAN en forçant l'IP du packager depuis .env.local.
 * Utilisez : npm run start:lan:host  (depuis kashup-mobile)
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

let hostname = process.env.REACT_NATIVE_PACKAGER_HOSTNAME;

if (!hostname && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^REACT_NATIVE_PACKAGER_HOSTNAME=(.+)$/);
    if (match) {
      hostname = match[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
    const urlMatch = trimmed.match(/^EXPO_PUBLIC_API_URL=(.+)$/);
    if (urlMatch && !hostname) {
      const url = urlMatch[1].trim().replace(/^["']|["']$/g, '');
      try {
        const u = new URL(url);
        hostname = u.hostname;
      } catch (_) {}
    }
  }
}

if (hostname) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
  console.log('Packager hostname:', hostname);
}

const env = { ...process.env };
if (hostname) env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;

const child = spawn('npx', ['expo', 'start', '--lan'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code || 0));
