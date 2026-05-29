# Totem NFC — integração com o UPX 7

## Fluxo (totem interativo)

```text
Tag NFC → Arduino → USB → pc-bridge → INSERT logs_nfc
                                          ↓
                    trigger: só IDENTIFICA (acao = identificacao | aluno_desconhecido)
                                          ↓ Realtime
                    App do totem (conta totem@facens.br) abre sessão do aluno
                                          ↓
                    Aluno escolhe na UI: Alugar guarda-chuva | Confirmar quadra | Devolver
                                          ↓
                    RPCs totem_* (SECURITY DEFINER) executam a ação
```

O **app do aluno** (celular) serve para **reservar** quadra, **ver** prazos, histórico e multas.
**Retirar, confirmar e devolver** itens físicos é no **totem** com a carteirinha.

| Onde | O que faz |
|------|-----------|
| App aluno | Reservar data/hora, alugar quadra **hoje** (escolhe slot), ver status |
| Totem | Identificar NFC → alugar guarda-chuva, check-in da reserva, devolver item(s) |
| Servidor | Regras, cron de quadra expirada, multas, `logs_nfc` |

## 1. Hardware

Montagem RC522: pinos **9–13 + 3.3V + GND** (ver `MONTAGEM-CABOS.md` se existir).

## 2. Arduino

1. `rc522-test-ntag213/TAG-NFC.ino` — placa Uno, biblioteca MFRC522, **9600** baud.
2. Ao aproximar a tag: `LOG:42E28005` no Serial.

## 3. Cadastrar UID

Tabela `alunos.uid_nfc` = mesmo hex do `LOG:` (maiúsculo, sem espaços).

## 4. Ponte USB (`pc-bridge`)

```bash
cd firmware/pc-bridge
npm install
cp .env.example .env
# SUPABASE_URL, SUPABASE_KEY (service_role), TOTEM_ID, SERIAL_PORT
npm start -- --port /dev/cu.usbmodem1101
```

A ponte reconecta se a USB cair e avisa no console se o cartão não estiver cadastrado.

## 5. App totem

1. Login: `totem@facens.br` (ver migration `totem_profile`).
2. Tela ociosa → aproximar carteirinha → navbar **Alugar / Quadra / Devolver**.
3. Sessão encerra após inatividade ou ao concluir ação.

## 6. Testar (aluno)

1. `npm run dev` + login aluno com `uid_nfc`.
2. Reservar quadra ou guarda-chuva (app) → ir ao totem para confirmar/devolver.
3. Bridge + Arduino rodando.

## Migrações relevantes

1. `20260528140000_nfc_totem_server_side_actions.sql` — logs NFC (histórico)
2. `20260529000000_totem_interativo.sql` — identificação + RPCs totem
3. `20260529120000_totem_polish.sql` — cron quadra, devolver múltiplo, `via_totem`
