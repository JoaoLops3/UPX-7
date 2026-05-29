-- Agenda encerramento automático de quadras (requer pg_cron habilitado no Dashboard).
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'upx7_encerrar_quadras') THEN
      PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'upx7_encerrar_quadras' LIMIT 1));
    END IF;
    PERFORM cron.schedule(
      'upx7_encerrar_quadras',
      '*/5 * * * *',
      $$SELECT public.encerrar_quadras_expiradas();$$
    );
  END IF;
END;
$body$;
