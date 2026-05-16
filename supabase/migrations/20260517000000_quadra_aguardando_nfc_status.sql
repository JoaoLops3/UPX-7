-- Status aguardando_nfc: horário da quadra acabou, item liberado, aluno tem 10 min para confirmar no totem.
-- Sem multa na quadra. Encerramento automático após a janela de tolerância (app).

COMMENT ON COLUMN public.alugueis.status IS
  'ativo | devolvido | atrasado (guarda-chuva) | aguardando_nfc (quadra pós-horário)';
