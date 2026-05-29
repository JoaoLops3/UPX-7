# Totem NFC — integração com o UPX 7

Hardware (Arduino + RC522) e ponte USB que enviam leituras NFC ao Supabase. O **app totem** reage em tempo real e o aluno escolhe a ação na tela.

## Fluxo (totem interativo)

```text
Tag NFC → Arduino (Serial) → pc-bridge → INSERT logs_nfc
                                              ↓
                        trigger: só IDENTIFICA (identificacao | aluno_desconhecido)
                                              ↓ Realtime
                        App totem (totem@facens.br) abre sessão do aluno
                                              ↓
                        UI: Alugar | Quadra | Devolver (escolhe item se tiver 2 ativos)
                                              ↓
                        RPCs totem_* executam a ação no servidor
```

### Quem faz o quê

| Onde | Responsabilidade |
|------|------------------|
| **App aluno** | Reservar quadra (data/horário), ver prazos, histórico, multas, notificações |
| **Totem** | Identificar NFC → alugar guarda-chuva, check-in da reserva, devolver item(s) |
| **Servidor** | RPCs `totem_*`, cron de quadra expirada, multas, `via_totem` no histórico |

O app **não** faz check-in, aluguel de guarda-chuva nem devolução — isso é sempre no totem.

---

## 1. Hardware

**Arduino Uno + RC522 (NTAG213 ou similar)**

| RC522 | Arduino |
|-------|---------|
| RST   | 9       |
| SDA (SS) | 10  |
| MOSI  | 11      |
| MISO  | 12      |
| SCK   | 13      |
| 3.3V  | 3.3V    |
| GND   | GND     |

LED opcional no pino **8** (acende enquanto a tag está no sensor).

Firmware: [`rc522-test-ntag213/TAG-NFC.ino`](rc522-test-ntag213/TAG-NFC.ino) — biblioteca **MFRC522**, **9600** baud.

---

## 2. Arduino

1. Abra `TAG-NFC.ino` no Arduino IDE.
2. Selecione placa **Arduino Uno** e a porta USB correta.
3. Envie o sketch.
4. Monitor Serial (9600): ao encostar a tag deve aparecer `LOG:312FAF97` (hex do UID).

O debounce evita leituras duplicadas; a ponte também ignora o mesmo UID por 3 segundos.

---

## 3. Cadastrar UID da carteirinha

O UID do `LOG:` (maiúsculo, sem espaços) deve existir em `alunos.uid_nfc`.

**Pelo app admin (recomendado)**

1. Login `admin@facens.br`
2. Aba **Alunos** → toque no aluno → **Editar UID NFC**
3. Cartão não reconhecido? **Início admin → Logs NFC** (filtro “não cadastrados”)

**Pelo SQL (alternativa)**

```sql
UPDATE alunos SET uid_nfc = '312FAF97' WHERE ra = '223969';
```

---

## 4. Ponte USB (`pc-bridge`)

Conecta a serial do Arduino ao Supabase (`logs_nfc`).

### Setup rápido (raiz do repo)

```bash
npm run totem:setup    # npm install + copia .env a partir do .env da raiz
npm run totem:ports    # listar portas seriais
npm run totem:bridge   # iniciar ponte (usa SERIAL_PORT do .env)
```

### Setup manual

```bash
cd firmware/pc-bridge
npm install
cp .env.example .env
# Edite: SUPABASE_URL, SUPABASE_KEY, TOTEM_ID, SERIAL_PORT
npm start -- --port /dev/cu.usbmodem1101
```

### Variáveis (`.env`)

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_KEY` | Service role ou chave com INSERT em `logs_nfc` |
| `TOTEM_ID` | Identificador do totem (ex.: `TOTEM-QUADRA-01`) |
| `SERIAL_PORT` | Porta USB do Arduino (vazio = lista portas ao iniciar) |
| `SERIAL_BAUD` | `9600` para `TAG-NFC.ino` |
| `RECONNECT_MS` | Reconexão automática se USB cair (padrão 3000) |
| `HEARTBEAT_MS` | Log de saúde no terminal (padrão 60000) |

### Logs no terminal

| Mensagem | Significado |
|----------|-------------|
| `[Site] Enviado — uid=… (aluno identificado)` | UID cadastrado, totem pode abrir sessão |
| `[Site] Cartão NÃO cadastrado — uid=…` | Cadastre em Admin → Alunos |
| `[Bridge] OK — serial ativo · uptime …` | Heartbeat; ponte rodando |
| `[Serial] Reconectando em 3s…` | USB caiu; reconexão automática |

---

## 5. App totem

1. **Login:** `totem@facens.br` (perfil em `totens`; ver migration `20260528160000_totem_profile.sql`).
2. **Ocioso:** “Aproxime a carteirinha”.
3. **Sessão:** abas **Alugar / Quadra / Devolver**; timeout ~30s ou botão Encerrar.
4. **Logout:** “Sair do totem” (tela inicial ou durante sessão).

Conta totem no app React Native/Expo — mesma build do aluno, gate em `App.tsx` (`useTotem()`).

Para tablet fixo: [`docs/KIOSK-TABLET.md`](../docs/KIOSK-TABLET.md).

---

## 6. Servidor (Supabase)

### RPCs do totem

- `totem_aluno_por_uid` — identifica aluno na sessão
- `totem_status_aluno` — itens ativos + flags check-in/guarda
- `totem_alugar_guarda_chuva` / `totem_checkin_quadra` / `totem_devolver`

### Cron — quadra expirada

Job `upx7_encerrar_quadras` (pg_cron, a cada 5 min) chama `encerrar_quadras_expiradas()`:

- `ativo` após `fim_previsto` → `aguardando_nfc` + libera quadra
- Após **+10 min** sem devolução no totem → `devolvido`

Extensão **pg_cron** deve estar habilitada no Dashboard Supabase.

### Migrações relevantes

| Arquivo | Conteúdo |
|---------|----------|
| `20260528140000_nfc_totem_server_side_actions.sql` | Trigger `processar_leitura_nfc`, logs |
| `20260529000000_totem_interativo.sql` | Identificação + RPCs totem |
| `20260529120000_totem_polish.sql` | `via_totem`, devolver múltiplo, `encerrar_quadras_expiradas` |
| `20260529140000_schedule_encerrar_quadras_cron.sql` | Agendamento pg_cron |

---

## 7. Testar ponta a ponta

1. Arduino + `npm run totem:bridge` rodando.
2. Totem logado; aluno com `uid_nfc` cadastrado.
3. **App aluno:** reservar quadra → no horário, check-in no totem (aba Quadra).
4. **Guarda-chuva:** só no totem (aba Alugar).
5. **Devolver:** aba Devolver; com 2 itens ativos, escolher qual devolver.

Checklist completo: [`docs/E2E-CHECKLIST.md`](../docs/E2E-CHECKLIST.md).

---

## Estrutura desta pasta

```text
firmware/
├── README.md                 ← este arquivo
├── rc522-test-ntag213/
│   └── TAG-NFC.ino           ← sketch Arduino
└── pc-bridge/
    ├── bridge.mjs            ← ponte serial → Supabase
    ├── setup-env.mjs         ← gera .env a partir da raiz do repo
    ├── .env.example
    └── package.json
```
