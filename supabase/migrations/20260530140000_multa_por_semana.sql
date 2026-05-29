-- Multa de guarda-chuva: R$ 5,00 por semana de atraso (1–7 dias = 1 semana = R$ 5,00).

CREATE OR REPLACE FUNCTION public.gerar_multa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_dias int;
  v_semanas int;
  v_valor numeric;
BEGIN
  IF NEW.fim_real IS NULL OR NEW.fim_real <= NEW.fim_previsto THEN
    RETURN NEW;
  END IF;

  SELECT tipo INTO v_tipo FROM public.itens WHERE id = NEW.item_id;
  IF v_tipo IS DISTINCT FROM 'guarda_chuva' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.multas WHERE aluguel_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_dias := ceil(extract(epoch FROM NEW.fim_real - NEW.fim_previsto) / 86400)::int;
  IF v_dias <= 0 THEN
    RETURN NEW;
  END IF;

  v_semanas := ceil(v_dias / 7.0)::int;
  v_valor := v_semanas * 5.00;

  INSERT INTO public.multas (aluno_id, aluguel_id, dias_atraso, valor, status)
  VALUES (NEW.aluno_id, NEW.id, v_dias, v_valor, 'pendente');

  RETURN NEW;
END;
$$;

-- Recalcula multas pendentes existentes com a nova regra.
UPDATE public.multas
SET valor = ceil(dias_atraso / 7.0) * 5.00
WHERE status = 'pendente'
  AND dias_atraso > 0;
