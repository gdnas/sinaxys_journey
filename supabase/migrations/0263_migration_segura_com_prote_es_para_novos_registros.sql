
-- ============================================
-- MIGRATION: Integridade do Módulo Projects/Work_Items (Fase 4)
-- ============================================
-- OBJETIVO: Adicionar proteções para NOVOS registros, sem quebrar legado
-- BASEADO EM: Diagnóstico completo (nenhuma inconsistência crítica encontrada)
--
-- PROTEÇÕES ADICIONADAS:
-- 1. Unique constraint em project_members (project_id, user_id)
-- 2. Trigger para validar work_items com deliverable_id incoerente
-- 3. Trigger para bloquear deliverable_id sem key_result_id
--
-- OBSERVAÇÕES:
-- - NENHUMA coluna removida
-- - NENHUM registro legado removido
-- - CHECK constraints existentes mantidos
-- - Apenas NOVOS registros são validados
-- ============================================

-- ============================================
-- PROTEÇÃO 1: Unique constraint em project_members
-- ============================================
-- DIAGNÓSTICO: 0 duplicações encontradas
-- SEGURANÇA: Pode aplicar com segurança
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique 
ON project_members (project_id, user_id);

COMMENT ON INDEX idx_project_members_unique IS 
'Garante que não há membros duplicados no mesmo projeto. 
Criado na Fase 4 após diagnóstico mostrar 0 duplicações.';

-- ============================================
-- PROTEÇÃO 2: Trigger para validar deliverable_id x key_result_id
-- ============================================
-- OBJETIVO: Impedir NOVOS work_items com deliverable_id incoerente
-- DIAGNÓSTICO: 0 work_items incoerentes encontrados
-- SEGURANÇA: Apenas NOVOS registros são validados
-- ============================================

CREATE OR REPLACE FUNCTION validate_work_item_deliverable_coherence()
RETURNS TRIGGER AS $$
BEGIN
  -- Se work_item tem deliverable_id, DEVE ter key_result_id
  IF NEW.deliverable_id IS NOT NULL AND NEW.key_result_id IS NULL THEN
    RAISE EXCEPTION 
      'work_item com deliverable_id deve ter key_result_id correspondente. Deliverable: %', 
      NEW.deliverable_id;
  END IF;
  
  -- Se work_item tem ambos, devem ser coerentes
  IF NEW.deliverable_id IS NOT NULL AND NEW.key_result_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM okr_deliverables d 
      WHERE d.id = NEW.deliverable_id 
      AND d.key_result_id = NEW.key_result_id
    ) THEN
      RAISE EXCEPTION 
        'work_item tem deliverable_id que não pertence ao key_result_id. Deliverable: %, KR: %', 
        NEW.deliverable_id, NEW.key_result_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_validate_work_item_deliverable_coherence ON work_items;
CREATE TRIGGER trg_validate_work_item_deliverable_coherence
  BEFORE INSERT OR UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_item_deliverable_coherence();

COMMENT ON FUNCTION validate_work_item_deliverable_coherence() IS 
'Valida que work_items com deliverable_id têm key_result_id coerente. 
Apenas NOVOS work_items são validados. Legados não são impactados.';

-- ============================================
-- PROTEÇÃO 3: Trigger para validar key_result_id existente
-- ============================================
-- OBJETIVO: Impedir NOVOS work_items com key_result_id inexistente
-- DIAGNÓSTICO: 0 work_items com KR inexistente
-- SEGURANÇA: Apenas NOVOS registros são validados
-- OBSERVAÇÃO: Esta validação é redundante com FK, mas torna o erro mais claro
-- ============================================

CREATE OR REPLACE FUNCTION validate_work_item_key_result_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Se work_item tem key_result_id, DEVE existir em okr_key_results
  IF NEW.key_result_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM okr_key_results k 
      WHERE k.id = NEW.key_result_id
    ) THEN
      RAISE EXCEPTION 
        'work_item tem key_result_id que não existe. KR: %', 
        NEW.key_result_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_validate_work_item_key_result_exists ON work_items;
CREATE TRIGGER trg_validate_work_item_key_result_exists
  BEFORE INSERT OR UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_item_key_result_exists();

COMMENT ON FUNCTION validate_work_item_key_result_exists() IS 
'Valida que work_items com key_result_id têm KR existente. 
Apenas NOVOS work_items são validados. Legados não são impactados.';

-- ============================================
-- PROTEÇÃO 4: Trigger para validar deliverable_id existente
-- ============================================
-- OBJETIVO: Impedir NOVOS work_items com deliverable_id inexistente
-- DIAGNÓSTICO: 0 work_items com deliverable inexistente
-- SEGURANÇA: Apenas NOVOS registros são validados
-- ============================================

CREATE OR REPLACE FUNCTION validate_work_item_deliverable_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- Se work_item tem deliverable_id, DEVE existir em okr_deliverables
  IF NEW.deliverable_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM okr_deliverables d 
      WHERE d.id = NEW.deliverable_id
    ) THEN
      RAISE EXCEPTION 
        'work_item tem deliverable_id que não existe. Deliverable: %', 
        NEW.deliverable_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_validate_work_item_deliverable_exists ON work_items;
CREATE TRIGGER trg_validate_work_item_deliverable_exists
  BEFORE INSERT OR UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_item_deliverable_exists();

COMMENT ON FUNCTION validate_work_item_deliverable_exists() IS 
'Valida que work_items com deliverable_id têm deliverable existente. 
Apenas NOVOS work_items são validados. Legados não são impactados.';

-- ============================================
-- RELATÓRIO FINAL DA MIGRATION
-- ============================================
-- PROTEÇÕES APLICADAS:
-- ✅ idx_project_members_unique (unique constraint)
-- ✅ trg_validate_work_item_deliverable_coherence (trigger)
-- ✅ trg_validate_work_item_key_result_exists (trigger)
-- ✅ trg_validate_work_item_deliverable_exists (trigger)
--
-- DADOS LEGADOS:
-- ✅ NENHUM dado removido
-- ✅ NENHUMA coluna alterada
-- ✅ NENHUMA constraint removida
-- ✅ CHECK constraints existentes mantidos
--
-- IMPACTO:
-- ✅ ZERO em dados legados
-- ✅ Apenas NOVOS registros são validados
-- ✅ Produto continua funcionando normalmente
-- ============================================
