# Relatório: Coerência Estratégica Obrigatória em Projects

**Data:** 2025-03-17
**Status:** ✅ IMPLEMENTADO E VALIDADO
**Arquivo:** `supabase/migrations/20250317_strategic_context_validation_final.sql`

---

## 🎯 Regra de Negócio Implementada

### **Regra Final Corrigida:**
```
1. key_result_id é OBRIGATÓRIO
2. deliverable_id é OPCIONAL
3. Se deliverable_id existir, deve pertencer ao key_result_id informado
```

### **Comportamento:**
- **INSERT:** OBRIGATÓRIO ter `key_result_id`
- **UPDATE:** OBRIGATÓRIO manter `key_result_id` (se já existir)
- **PROJETOS LEGADOS:** Continuam funcionando (sem `key_result_id`), mas não podem remover contexto de projetos válidos

---

## 📋 Diff Exato do Arquivo SQL

### **Arquivo:** `supabase/migrations/20250317_strategic_context_validation_final.sql`

**CONTEÚDO COMPLETO:**
```sql
-- =====================================================
-- MIGRATION: Coerência Estratégica Obrigatória em Projects
-- =====================================================
-- Regra de Negócio:
-- - key_result_id é OBRIGATÓRIO
-- - deliverable_id é OPCIONAL
-- - Se deliverable_id existir, deve pertencer ao key_result_id

CREATE OR REPLACE FUNCTION public.ensure_project_tenant_coherence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  owner_company uuid;
  creator_company uuid;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
begin
  perform set_config('row_security', 'off', true);

  if new.owner_user_id is not null then
    select company_id::uuid into owner_company from public.profiles where id = new.owner_user_id;
    if owner_company is not null and owner_company <> new.tenant_id then
      raise exception 'owner_user_id belongs to different tenant';
    end if;
  end if;

  if new.created_by_user_id is not null then
    select company_id::uuid into creator_company from public.profiles where id = new.created_by_user_id;
    if creator_company is not null and creator_company <> new.tenant_id then
      raise exception 'created_by_user_id belongs to different tenant';
    end if;
  end if;

  if new.key_result_id is not null then
    select o.company_id::uuid
      into key_result_company
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = new.key_result_id;

    if key_result_company is null then
      raise exception 'key_result_id not found';
    end if;

    if key_result_company <> new.tenant_id then
      raise exception 'project.key_result belongs to different tenant';
    end if;
  end if;

  if new.deliverable_id is not null then
    select o.company_id::uuid, d.key_result_id
      into deliverable_company, deliverable_key_result_id
    from public.okr_deliverables d
    join public.okr_key_results kr on kr.id = d.key_result_id
    join public.okr_objectives o on o.id = kr.objective_id
    where d.id = new.deliverable_id;

    if deliverable_company is null then
      raise exception 'deliverable_id not found';
    end if;

    if deliverable_company <> new.tenant_id then
      raise exception 'project.deliverable belongs to different tenant';
    end if;

    if new.key_result_id is null then
      raise exception 'deliverable_id requires key_result_id';
    end if;

    if deliverable_key_result_id <> new.key_result_id then
      raise exception 'deliverable_id does not belong to key_result_id';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.key_result_id is null then
      raise exception 'key_result_id is required';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.key_result_id is not null and new.key_result_id is null then
      raise exception 'Cannot remove key_result_id from project';
    end if;
  end if;

  return new;
end;
$function$;
```

**MUDANÇAS vs VERSÃO ANTERIOR:**

| Aspecto | Anterior (ERRADO) | Atual (CORRETO) |
|---------|------------------|----------------|
| `is_legacy_project` | ✅ Declarado mas ❌ NÃO usado | ✅ REMOVIDO |
| Regra INSERT | `key_result_id OR deliverable_id` | `key_result_id` OBRIGATÓRIO |
| Regra UPDATE | Protege legado sem contexto | Bloqueia remoção de `key_result_id` |
| Código morto | Sim | Não |

---

## 🧪 Resultado dos Testes Reais

### **TESTE 1: INSERT sem key_result_id** ✅
```sql
INSERT INTO public.projects (tenant_id, name, owner_user_id, created_by_user_id, visibility, status, key_result_id)
VALUES ('...', 'Projeto Sem key_result', '...', '...', 'public', 'not_started', NULL);
```
**Resultado:** ✅ **BLOQUEADO**
```
ERROR: key_result_id is required
```
**Status:** SUCESSO - Validação funcionando

---

### **TESTE 2: INSERT com key_result_id válido** ✅
```sql
INSERT INTO public.projects (tenant_id, name, key_result_id, owner_user_id, created_by_user_id, visibility, status)
VALUES ('...', 'Projeto com key_result', '<kr_id>', '...', '...', 'public', 'not_started');
```
**Resultado:** ✅ **FUNCIONOU**
**Status:** SUCESSO - Validação permite insert válido

---

### **TESTE 3: INSERT com key_result_id + deliverable_id coerentes** ✅
```sql
INSERT INTO public.projects (tenant_id, name, key_result_id, deliverable_id, owner_user_id, created_by_user_id, visibility, status)
VALUES ('...', 'Projeto completo', '<kr_id>', '<deliv_id_kr>', '...', '...', 'public', 'not_started');
```
**Resultado:** ✅ **FUNCIONOU**
**Status:** SUCESSO - Validação permite deliverable coerente

---

### **TESTE 4: INSERT com deliverable_id sem key_result_id** ✅
```sql
INSERT INTO public.projects (tenant_id, name, deliverable_id, owner_user_id, created_by_user_id, visibility, status, key_result_id)
VALUES ('...', 'Projeto só com deliverable', '<deliv_id>', '...', '...', 'public', 'not_started', NULL);
```
**Resultado:** ✅ **BLOQUEADO**
```
ERROR: deliverable_id requires key_result_id
```
**Status:** SUCESSO - Validação de coerência hierárquica

---

### **TESTE 5: INSERT com deliverable_id incompatível com key_result_id** ✅
```sql
INSERT INTO public.projects (tenant_id, name, key_result_id, deliverable_id, owner_user_id, created_by_user_id, visibility, status)
VALUES ('...', 'Projeto incoerente', '<kr_id_1>', '<deliv_id_kr_2>', '...', '...', 'public', 'not_started');
```
**Resultado:** ✅ **BLOQUEADO**
```
ERROR: deliverable_id does not belong to key_result_id
```
**Status:** SUCESSO - Validação de integridade

---

### **TESTE 6: UPDATE removendo key_result_id de projeto válido** ✅
```sql
UPDATE public.projects SET key_result_id = NULL WHERE id = '<projeto_valido_id>';
```
**Resultado:** ✅ **BLOQUEADO**
```
ERROR: Cannot remove key_result_id from project
```
**Status:** SUCESSO - Proteção de integridade

---

### **TESTE 7: UPDATE de projeto legado sem contexto alterando nome/descrição** ✅
```sql
UPDATE public.projects SET name = 'Projeto Renomeado', description = 'Nova descrição' WHERE id = '<projeto_legado_id>';
```
**Resultado:** ✅ **FUNCIONOU**
**Status:** SUCESSO - Permite edição de outros campos em legado

---

## 📊 Lista Objetiva dos Projetos Legados Inválidos

```sql
SELECT 
    id,
    name,
    key_result_id,
    deliverable_id,
    status,
    created_at
FROM public.projects
WHERE key_result_id IS NULL
ORDER BY created_at;
```

**RESULTADO:**

| ID | Nome | key_result_id | deliverable_id | Status | Criação |
|----|------|--------------|----------------|--------|---------|
| `4195cc3d-f856-42dc-a548-464486dc3375` | Projeto teste Fase 4 | NULL | NULL | not_started | 2025-03-17 01:24:45 |
| `78d61014-4869-45f4-a777-87cc2d1ef9b7` | Projeto teste Fase 4 | NULL | NULL | not_started | 2025-03-17 01:25:03 |

**Total:** 2 projetos legados (sem key_result_id)

**Comportamento Atual:**
- ✅ Continuam funcionando
- ✅ Podem ser editados (outros campos)
- ✅ Podem receber key_result_id (correção)
- ❌ Não podem ser criados novos sem key_result_id
- ❌ Não podem ter key_result_id removido

---

## 📝 Explicação Curta do Comportamento Final

### **INSERT:**
1. **Com key_result_id:** ✅ Permite
2. **Sem key_result_id:** ❌ Bloqueia ("key_result_id is required")
3. **Com key_result_id + deliverable_id coerente:** ✅ Permite
4. **Com deliverable_id sem key_result_id:** ❌ Bloqueia ("deliverable_id requires key_result_id")
5. **Com deliverable_id incompatível:** ❌ Bloqueia ("deliverable_id does not belong to key_result_id")

### **UPDATE:**
1. **Projeto válido (com key_result_id):**
   - Editar outros campos: ✅ Permite
   - Remover key_result_id: ❌ Bloqueia
   - Adicionar deliverable_id coerente: ✅ Permite
   - Trocar key_result_id: ✅ Permite (se válido)
2. **Projeto legado (sem key_result_id):**
   - Editar outros campos: ✅ Permite
   - Adicionar key_result_id: ✅ Permite
   - Adicionar deliverable_id sem key_result_id: ❌ Bloqueia

---

## ✅ Checklist de Validação

- [x] Regra de negócio explícita: key_result_id OBRIGATÓRIO
- [x] deliverable_id OPCIONAL
- [x] Coerência hierárquica: deliverable pertence ao key_result
- [x] Código morto removido (is_legacy_project)
- [x] SQL final limpo e pronto para versionamento
- [x] TESTE 1: INSERT sem key_result_id → FALHOU ✅
- [x] TESTE 2: INSERT com key_result_id válido → FUNCIONOU ✅
- [x] TESTE 3: INSERT com key_result + deliverable coerentes → FUNCIONOU ✅
- [x] TESTE 4: INSERT com deliverable sem key_result → FALHOU ✅
- [x] TESTE 5: INSERT com deliverable incompatível → FALHOU ✅
- [x] TESTE 6: UPDATE removendo key_result → FALHOU ✅
- [x] TESTE 7: UPDATE de legado editando nome → FUNCIONOU ✅
- [x] Diagnóstico de legado correto (2 projetos identificados)
- [x] Nenhuma mudança em frontend
- [x] Nenhuma mudança em layout
- [x] Nenhuma mudança em notificações
- [x] Nenhuma mudança em outras tabelas

---

## 🚀 Arquivos Entregues

1. ✅ `supabase/migrations/20250317_strategic_context_validation_final.sql` - Migration definitiva
2. ✅ `supabase/migrations/REPORT_strategic_context_validation.md` - Este relatório

**Banco de dados:** ✅ Função atualizada e validando

---

## ⚠️ Riscos Identificados

| Risco | Severidade | Status |
|-------|-----------|--------|
| Projetos legados sem key_result_id podem quebrar frontend | BAIXO | MITIGADO - Permite UPDATE de outros campos |
| Frontend precisa ser atualizado para sempre incluir key_result_id | BAIXO | IDENTIFICADO - Próximo passo |
| Performance da validação | MUITO BAIXO | MITIGADO - Validações simples |

---

## 📞 Próximos Passos

**IMEDIATO (Correção de Legado):**
```sql
-- Corrigir projetos legados adicionando key_result_id
UPDATE public.projects
SET key_result_id = '<key_result_id_válido>'
WHERE id IN ('4195cc3d-f856-42dc-a548-464486dc3375', '78d61014-4869-45f4-a777-87cc2d1ef9b7');
```

**CURTO PRAZO (Frontend):**
- Atualizar formulário de criação de projeto para exigir key_result_id
- Adicionar validação no cliente
- Exibir mensagem clara de erro

---

**Autor:** Dyad AI Assistant
**Data:** 2025-03-17
**Versão:** 2.0 (CORRIGIDA)
