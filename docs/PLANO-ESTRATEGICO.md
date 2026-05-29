# Plano estratégico — UPX 7 (totem + app aluno)

Visão de engenharia sênior: **separar responsabilidades**, **fechar débito técnico** antes de features novas, e **validar fluxos físicos** (NFC) cedo.

## Princípios

1. **Totem = ações físicas** (identificar → escolher → executar via RPC `SECURITY DEFINER`).
2. **App aluno = planejar e acompanhar** (reservar, ver prazos, histórico, multas).
3. **Servidor = fonte da verdade** (regras, cron, logs NFC, RLS).
4. **Cada entrega = testável** (um fluxo E2E + migration aplicada + texto de UI alinhado).

## Fases

### Fase A — Consistência (fundação) ← **você pediu para começar aqui**
- Documentação (`firmware/README.md`) alinhada ao fluxo interativo.
- Notificações sem referência a abas removidas.
- Início: não oferecer “Alugar agora” se já existe reserva agendada.
- Remover/aposentar código morto das abas Scan/Devolução — concluído.

### Fase B — Regras de negócio no servidor
- Cron: encerrar quadra após `fim_previsto` (+ margem de graça NFC).
- RPC totem: listar **todos** os itens ativos; devolver por `aluguel_id` escolhido.
- Coluna `via_totem` em `alugueis` para histórico honesto.

### Fase C — Operação do totem
- `pc-bridge`: reconectar serial, log de cartão não cadastrado.
- UX totem: logout na sessão, aba inicial inteligente (opcional).

### Fase D — Polish
- Histórico com selo “Totem”.
- Push 15 min antes da reserva (já planejado; revisar copy).
- Textos Aluguel ativo = Início.

### Fase E — Produção
- Tablet kiosk, monitoramento da ponte, tipos Supabase regenerados, testes E2E documentados.

## Ordem de execução desta sprint

| # | Entrega | Depende de |
|---|---------|------------|
| 1 | Fase A (consistência) | — |
| 2 | Migration: cron quadra + RPC devolver múltiplo + `via_totem` | — |
| 3 | Totem UI: devolver lista de itens | #2 |
| 4 | pc-bridge estável | — |
| 5 | Histórico + notificações + Active copy | #2 |

## Riscos

- **Dois itens ativos**: resolvido com lista na aba Devolver (sua decisão).
- **Cron agressivo**: usar `fim_previsto + grace` (15 min) para não cortar quem está devolvendo no totem.
- **Web vs tablet**: `showConfirm` já usa `Alert` nativo fora da web; em dev web, `window.confirm` é aceitável.

## Critérios de “pronto”

- João: reserva quadra → check-in totem → devolver quadra **escolhendo** na lista (com guarda-chuva ativo).
- Quadra expirada libera item sozinha após cron.
- Ponte NFC reconecta após queda USB e avisa cartão desconhecido.
- Histórico mostra “via totem” onde aplicável.
