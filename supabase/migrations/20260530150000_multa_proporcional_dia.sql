-- Multa proporcional por dia: R$ 5,00 a cada 7 dias de atraso (7 dias = R$ 5,00).

CREATE OR REPLACE FUNCTION public.gerar_multa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_dias int;
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

  v_valor := round((v_dias * 5.00 / 7.0)::numeric, 2);

  INSERT INTO public.multas (aluno_id, aluguel_id, dias_atraso, valor, status)
  VALUES (NEW.aluno_id, NEW.id, v_dias, v_valor, 'pendente');

  RETURN NEW;
END;
$$;

UPDATE public.multas
SET valor = round((dias_atraso * 5.00 / 7.0)::numeric, 2)
WHERE status = 'pendente'
  AND dias_atraso > 0;
