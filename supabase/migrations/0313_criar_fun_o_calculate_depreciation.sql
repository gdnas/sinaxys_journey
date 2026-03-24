-- =====================================================
-- FUNÇÃO: Calcular depreciação linear
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_depreciation(
  p_purchase_value NUMERIC,
  p_useful_life_months INTEGER,
  p_purchase_date DATE,
  p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  accumulated_depreciation NUMERIC,
  residual_value NUMERIC,
  months_elapsed INTEGER
) AS $$
DECLARE
  v_months_elapsed INTEGER;
  v_accumulated_depreciation NUMERIC;
  v_residual_value NUMERIC;
BEGIN
  -- Calcular meses decorridos desde a compra
  v_months_elapsed := EXTRACT(MONTH FROM AGE(p_current_date, p_purchase_date));
  
  -- Calcular depreciação acumulada (máximo = valor de compra)
  v_accumulated_depreciation := LEAST(
    p_purchase_value,
    (p_purchase_value / p_useful_life_months) * v_months_elapsed
  );
  
  -- Valor residual = valor de compra - depreciação acumulada
  v_residual_value := GREATEST(0, p_purchase_value - v_accumulated_depreciation);
  
  RETURN QUERY SELECT v_accumulated_depreciation, v_residual_value, v_months_elapsed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMIT;