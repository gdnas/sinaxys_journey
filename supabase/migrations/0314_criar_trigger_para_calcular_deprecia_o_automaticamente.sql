-- =====================================================
-- FUNÇÃO: Atualizar depreciação em trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_asset_depreciation()
RETURNS TRIGGER AS $$
DECLARE
  v_depreciation RECORD;
BEGIN
  -- Calcular depreciação atualizada
  SELECT * INTO v_depreciation 
  FROM calculate_depreciation(NEW.purchase_value, NEW.useful_life_months, NEW.purchase_date);
  
  -- Atualizar valores
  NEW.accumulated_depreciation := v_depreciation.accumulated_depreciation;
  NEW.residual_value_current := v_depreciation.residual_value;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger para calcular depreciação em INSERT e UPDATE
DROP TRIGGER IF EXISTS trigger_calculate_depreciation ON public.assets;
CREATE TRIGGER trigger_calculate_depreciation
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_depreciation();

COMMIT;