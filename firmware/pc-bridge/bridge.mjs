/**
 * Arduino TAG-NFC.ino (9600 baud) -> Supabase logs_nfc -> app UPX 7
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
const RECONNECT_MS = Number(process.env.RECONNECT_MS ?? 3000);

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TOTEM_ID = process.env.TOTEM_ID ?? 'TOTEM-QUADRA-01';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUid(raw) {
  return String(raw).replace(/\s+/g, '').toUpperCase();
}

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
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  const rows = await res.json();
  const acao = rows?.[0]?.acao ?? 'leitura';
  return acao;
}

function attachParser(port, state) {
  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

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
    if (uid === state.ultimoUidEnviado && agora - state.ultimoEnvioMs < 3000) {
      return;
    }

    try {
      const acao = await postLog(uid);
      state.ultimoUidEnviado = uid;
      state.ultimoEnvioMs = agora;
      if (acao === 'aluno_desconhecido') {
        console.warn(`[Site] Cartão NÃO cadastrado — uid=${uid} (cadastre em alunos.uid_nfc)`);
      } else if (acao === 'identificacao') {
        console.log(`[Site] Enviado — uid=${uid} (aluno identificado)`);
      } else {
        console.log(`[Site] Enviado ao Supabase — uid=${uid} acao=${acao}`);
      }
    } catch (e) {
      console.error(`[Site] ERRO — ${e.message}`);
    }
  });

  port.on('error', (err) => {
    console.error('[Serial] Erro:', err.message);
  });

  port.on('close', () => {
    console.warn('[Serial] Porta fechada.');
  });
}

async function openPort(path) {
  const port = new SerialPort({ path, baudRate, autoOpen: false });
  await new Promise((resolve, reject) => {
    port.open((err) => (err ? reject(err) : resolve()));
  });
  return port;
}

async function runSession(path) {
  const state = { ultimoUidEnviado: '', ultimoEnvioMs: 0 };
  const port = await openPort(path);
  attachParser(port, state);
  console.log('[Serial] Conectado. Aguardando tags...\n');

  await new Promise((resolve) => {
    port.on('close', resolve);
    port.on('error', () => resolve());
  });
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

  console.log('UPX 7 — ponte NFC (reconexão automática)');
  console.log(`Porta: ${portArg} | Baud: ${baudRate} | Totem: ${TOTEM_ID}\n`);

  for (;;) {
    try {
      await runSession(portArg);
    } catch (e) {
      console.error(`[Serial] ${e.message}`);
    }
    console.log(`[Serial] Reconectando em ${RECONNECT_MS / 1000}s...\n`);
    await sleep(RECONNECT_MS);
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
