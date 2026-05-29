# Totem NFC — integração com o site UPX 7

## Fluxo

```text
Tag NFC → Arduino (TAG-NFC.ino) → USB → pc-bridge → INSERT em logs_nfc
                                                       ↓
                          trigger processar_leitura_nfc (no banco)
                          ↳ acha o aluno pelo uid_cartao
                          ↳ decide e executa a ação pelo estado do aluno
                                                       ↓ Realtime
                                          App (apenas observa / atualiza)
```

A **ação acontece no servidor** (Supabase), não no app. O totem fica fixo na
quadra e funciona mesmo que o aluno não esteja com o app aberto/logado. O app no
celular serve para o aluno **ver** reservas, prazos e multas e reage ao resultado.

| Estado do aluno na leitura | Ação executada pelo servidor |
|----------------------------|------------------------------|
| Reserva de quadra agendada com janela aberta (início −15 min até o fim) | **Check-in** (ativa a reserva) |
| Aluguel **ativo** ou **aguardando_nfc** | **Devolução** (multa do guarda-chuva atrasado é automática) |
| Cartão sem cadastro / sem nada pendente | Apenas registra `aluno_desconhecido` / `sem_acao` |

> Iniciar um **aluguel novo** continua sendo feito pelo app no celular — o totem
> só faz check-in e devolução.

## 1. Hardware

Montagem RC522: [`MONTAGEM-CABOS.md`](MONTAGEM-CABOS.md) (se existir) ou pinos **9–13 + 3.3V + GND**.

## 2. Gravar o Arduino

1. Abra `rc522-test-ntag213/TAG-NFC.ino` na Arduino IDE.
2. Placa: **Arduino Uno**.
3. Biblioteca: **MFRC522**.
4. Upload.

Ao aproximar a tag: `LOG:42E28005` e `[OK] Tag liberada` no Serial (**9600** baud).

## 3. Cadastrar UID no aluno

No Supabase, tabela `alunos`, campo `uid_nfc`:

- Mesmo valor do `LOG:` (hex maiúsculo, sem espaços), ex.: `42E28005`

## 4. Ponte USB → site

```bash
cd firmware/pc-bridge
npm install
cp .env.example .env
```

Preencha `.env`:

- `SUPABASE_URL` — igual ao app (`EXPO_PUBLIC_SUPABASE_URL`)
- `SUPABASE_KEY` — **service_role** (só no `.env`, nunca no app)
- `TOTEM_ID` — ex.: `TOTEM-QUADRA-01`
- `SERIAL_BAUD=9600`
- `SERIAL_PORT` — ou passe na linha de comando

```bash
npm run ports
npm start -- --port /dev/cu.usbmodem14101
```

Feche o **Monitor Serial** da Arduino IDE antes de rodar o bridge.

## 5. Testar o app

1. `npm run dev` — app aberto no navegador.
2. Login como aluno com `uid_nfc` cadastrado.
3. Bridge rodando + Arduino conectado.
4. **Check-in:** tela Scan → aproximar tag.
5. **Devolução:** aba Devolução com aluguel ativo → aproximar tag.

## Migração Supabase

Aplique, em ordem:

1. `supabase/migrations/20260528120000_logs_nfc_student_realtime.sql` — aluno recebe Realtime do próprio cartão.
2. `supabase/migrations/20260528130000_logs_nfc_insert_totem.sql` — pc-bridge pode gravar leituras.
3. `supabase/migrations/20260528140000_nfc_totem_server_side_actions.sql` — trigger que faz check-in/devolução no servidor.

## Pastas

| Pasta | Uso |
|-------|-----|
| `rc522-test-ntag213/TAG-NFC.ino` | Sketch principal (LED + LOG) |
| `pc-bridge/` | Envia leituras ao Supabase |
| `upx7-totem-nfc/` | Variante só LOG (115200 baud) |
