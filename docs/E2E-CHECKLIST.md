# Checklist E2E — UPX 7

Fluxo completo para validar totem + app + servidor após deploy ou mudança relevante.

## Pré-requisitos

- [ ] Conta aluno de teste com `uid_nfc` cadastrado (Admin → Alunos → Editar UID NFC)
- [ ] `pc-bridge` rodando (`npm run totem:bridge`) com Arduino conectado
- [ ] Totem logado (`totem@facens.br`)
- [ ] pg_cron job `upx7_encerrar_quadras` ativo

## 1. Reserva no app

- [ ] Login aluno no app
- [ ] Início → **Reservar data** ou **Alugar agora** (hoje)
- [ ] Confirmar reserva → status `agendado` no Início
- [ ] Push 15 min antes (opcional: ajustar horário de teste)

## 2. Check-in no totem

- [ ] Aproximar carteirinha no totem (dentro da janela: 15 min antes do horário)
- [ ] Aba **Quadra** → Confirmar aluguel
- [ ] Quadra passa para `ativo`; app Início mostra countdown

## 3. Dois itens ativos + devolução escolhida

- [ ] Com quadra ativa, aba **Alugar** → guarda-chuva
- [ ] Nova sessão NFC → aba **Devolver** mostra **2 cards**
- [ ] Devolver um item; repetir para o segundo

## 4. Histórico e via_totem

- [ ] App → Histórico: eventos do totem com badge **Ação no totem**

## 5. Cron — quadra expirada

- [ ] Reserva/check-in com `fim_previsto` no passado (teste SQL ou esperar)
- [ ] Após cron (≤5 min): status `aguardando_nfc`, quadra `disponivel=true`
- [ ] Após +10 min graça: status `devolvido`

## 6. Cartão desconhecido

- [ ] Tag não cadastrada no totem → aviso na tela
- [ ] Admin → Logs NFC → filtro "Só cartões não cadastrados"
- [ ] Vincular UID em Admin → Alunos

## 7. Bridge

- [ ] Desconectar USB → log `[Serial] Porta fechada` + reconexão automática
- [ ] Heartbeat a cada 60s: `[Bridge] OK — serial ativo`
