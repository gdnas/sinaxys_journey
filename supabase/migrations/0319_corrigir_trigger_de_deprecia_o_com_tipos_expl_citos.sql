-- =====================================================
-- CORREÇÃO DO TRIGGER DE DEPRECIAÇÃO
-- =====================================================

-- Desabilitar temporariamente o trigger problemático
DROP TRIGGER IF EXISTS trigger_calculate_depreciation ON public.assets;

-- Recriar a função com tipos explícitos
CREATE OR REPLACE FUNCTION update_asset_depreciation()
RETURNS TRIGGER AS $$
DECLARE
  v_depreciation RECORD;
  v_purchase_date_val DATE;
BEGIN
  -- Converter purchase_date para DATE explicitamente
  v_purchase_date_val := NEW.purchase_date::DATE;
  
  -- Calcular depreciação atualizada
  SELECT * INTO v_depreciation 
  FROM calculate_depreciation(
    NEW.purchase_value::NUMERIC,
    NEW.useful_life_months::INTEGER,
    v_purchase_date_val
  );
  
  -- Atualizar valores
  NEW.accumulated_depreciation := v_depreciation.accumulated_depreciation;
  NEW.residual_value_current := v_depreciation.residual_value;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recriar o trigger
CREATE TRIGGER trigger_calculate_depreciation
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_depreciation();

COMMIT;