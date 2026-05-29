/**
 * Arduino TAG-NFC.ino (9600 baud) -> Supabase logs_nfc -> app UPX 7
 *
 * Le linhas LOG:UID ou [OK] Tag liberada com UID no Serial.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const path = resolve(__dir, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const args = process.argv.slice(2);
const listOnly = args.includes('--list-ports');
const portArg = args.find((a, i) => args[i - 1] === '--port') ?? process.env.SERIAL_PORT;
const baudRate = Number(process.env.SERIAL_BAUD ?? 9600);

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TOTEM_ID = process.env.TOTEM_ID ?? 'TOTEM-QUADRA-01';

function normalizeUid(raw) {
  return String(raw).replace(/\s+/g, '').toUpperCase();
}

/** Extrai UID de LOG:42E28005 ou de linhas com "UID:" */
function extractUid(line) {
  const trimmed = String(line).trim();
  if (trimmed.startsWith('LOG:')) {
    return normalizeUid(trimmed.slice(4));
  }
  const match = trimmed.match(/UID:\s*([0-9A-Fa-f\s]+)/i);
  if (match) {
    return normalizeUid(match[1]);
  }
  return '';
}

async function listPorts() {
  const ports = await SerialPort.list();
  if (ports.length === 0) {
    console.log('Nenhuma porta serial encontrada.');
    return;
  }
  console.log('Portas disponíveis:\n');
  for (const p of ports) {
    console.log(`  ${p.path}`);
  }
  console.log('\nUse: npm start -- --port CAMINHO_DA_PORTA');
}

async function postLog(uid) {
  const url = `${SUPABASE_URL}/rest/v1/logs_nfc`;
  const body = {
    uid_cartao: uid,
    uid_totem: TOTEM_ID,
    acao: 'leitura',
    sucesso: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
}

async function main() {
  if (listOnly) {
    await listPorts();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Defina SUPABASE_URL e SUPABASE_KEY em firmware/pc-bridge/.env');
    process.exit(1);
  }

  if (!portArg) {
    console.log('SERIAL_PORT não definido. Portas USB:\n');
    await listPorts();
    process.exit(1);
  }

  console.log(`UPX 7 — ponte NFC`);
  console.log(`Porta: ${portArg} | Baud: ${baudRate} | Totem: ${TOTEM_ID}`);
  console.log('Aguardando LOG:UID do Arduino...\n');

  const port = new SerialPort({ path: portArg, baudRate, autoOpen: false });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });

  let ultimoUidEnviado = '';
  let ultimoEnvioMs = 0;

  parser.on('data', async (line) => {
    const trimmed = String(line).trim();
    if (!trimmed) return;

    if (trimmed.startsWith('[OK] Tag removida')) {
      console.log('[Arduino] Tag removida do sensor');
      return;
    }

    const uid = extractUid(trimmed);
    if (!uid || uid.length < 4) {
      if (trimmed.startsWith('[')) {
        console.log(`[Arduino] ${trimmed}`);
      }
      return;
    }

    const agora = Date.now();
    if (uid === ultimoUidEnviado && agora - ultimoEnvioMs < 3000) {
      return;
    }

    try {
      await postLog(uid);
      ultimoUidEnviado = uid;
      ultimoEnvioMs = agora;
      console.log(`[Site] Enviado ao Supabase — uid_cartao=${uid}`);
    } catch (e) {
      console.error(`[Site] ERRO — ${e.message}`);
    }
  });

  port.on('error', (err) => {
    console.error('Erro na porta serial:', err.message);
  });
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
