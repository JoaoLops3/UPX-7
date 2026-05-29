import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const rootEnv = resolve(__dir, '../../.env');
const out = resolve(__dir, '.env');

function parseEnv(text) {
  const map = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    map[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return map;
}

if (!existsSync(rootEnv)) {
  console.error('Crie .env na raiz do projeto primeiro.');
  process.exit(1);
}

const root = parseEnv(readFileSync(rootEnv, 'utf8'));
const url = root.EXPO_PUBLIC_SUPABASE_URL ?? root.SUPABASE_URL;
const key =
  root.SUPABASE_SERVICE_ROLE_KEY ??
  root.SUPABASE_KEY ??
  root.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltam URL/chave Supabase no .env da raiz.');
  process.exit(1);
}

const content = `# Gerado por npm run setup-env — edite SERIAL_PORT se precisar
SUPABASE_URL=${url}
SUPABASE_KEY=${key}
TOTEM_ID=TOTEM-QUADRA-01
SERIAL_BAUD=9600
SERIAL_PORT=
`;

writeFileSync(out, content);
console.log('Criado firmware/pc-bridge/.env');
console.log('Defina SERIAL_PORT ou use: npm start -- --port /dev/cu.usbmodem...');
