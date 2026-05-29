# Tablet kiosk — totem UPX 7

Guia para deixar o app totem estável em tablet fixo no campus.

## Conta e login

1. Instale o build nativo (Expo `expo run:android` / TestFlight ou APK interno).
2. Faça login uma vez com a conta totem (`totem@facens.br`).
3. Use **Sair do totem** só para manutenção (botão na tela inicial ou na sessão do aluno).

## Modo kiosk (Android)

- **Fixar app**: Configurações → Apps → UPX 7 → fixar tela / modo pin (varia por fabricante).
- **Orientação**: trave retrato se o totem for vertical.
- **Brilho**: mantenha carregando; desative suspensão de tela enquanto o app estiver aberto.

## Modo kiosk (iPad)

- **Guided Access**: Ajustes → Acessibilidade → Acesso guiado → ativar; triple-click Home/Side para fixar UPX 7.
- Desative notificações de outros apps na sessão do totem.

## Web (dev / fallback)

- Abra a URL do totem em Chrome/Edge em tela cheia (F11).
- Logout usa `window.confirm`; em tablet nativo o Alert do sistema é usado.

## Ponte NFC (PC)

```bash
npm run totem:setup
npm run totem:bridge
```

- Variáveis em `firmware/pc-bridge/.env`: `SERIAL_PORT`, `SUPABASE_URL`, `SUPABASE_KEY`, `TOTEM_ID`.
- `HEARTBEAT_MS=60000` — log periódico de saúde no terminal.
- `RECONNECT_MS=3000` — reconexão USB automática.

## Monitoramento

- Terminal da ponte: heartbeat `[Bridge] OK` a cada minuto.
- Supabase: Admin → **Logs NFC** para leituras e cartões não cadastrados.
- pg_cron: job `upx7_encerrar_quadras` a cada 5 min.

## Reinício diário (recomendado)

- Reinicie tablet + PC da ponte uma vez por dia (antes do campus abrir).
- Confirme login totem e uma leitura NFC de teste.
