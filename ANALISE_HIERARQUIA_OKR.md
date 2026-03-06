# Análise de Conformidade da Hierarquia OKR

## Status Atual vs Requisitos Especificados

### ✅ IMPLEMENTADO CORRETAMENTE

#### a) Objetivos de Longo Prazo
- ✅ Objetivo de 2 anos é obrigatório (validação em `has2YearObjective`)
- ✅ Cascata: 10 anos → 5 anos → 2 anos
- ✅ Alinhamento automático entre objetivos de longo prazo

#### b) Objetivos Anuais
- ✅ Responsável principal: empresa toda (`level: "COMPANY"`)
- ✅ Moderador: selecionado em dropdown (`annualModeratorId`)
- ✅ Alinhamento ao objetivo de 2 anos (1:1 ou muitos:1)
- ✅ Todo objetivo anual é estratégico (tier 1)
- ✅ Pelo menos 1 KR por objetivo (validação: `o.krs.length < 1`)

#### 3.1) Objetivos Trimestrais Estratégicos (Tier 1)
- ✅ Responsável principal: empresa toda (`level: "COMPANY"`)
- ✅ Moderador: selecionado em dropdown (`quarterModeratorId`)
- ✅ Alinhamento a KR anual (1:1 ou muitos:1)
- ✅ Tier definido como `"TIER1"`
- ✅ Indicadores de Performance implementados (`PerformanceIndicatorEditor`)

#### 3.2) Objetivos Trimestrais Táticos (Tier 2)
- ✅ Múltiplos responsáveis (heads/admins)
- ✅ Múltiplos departamentos
- ✅ Alinhamento a KR estratégico trimestral
- ✅ Tier definido como `"TIER2"`

#### 4) Entregáveis
- ✅ 1 responsável por entregável
- ✅ Data de início e data prevista (`start_date`, `due_at`)
- ✅ Status padrão: TODO, IN_PROGRESS, DONE
- ✅ Alinhamento a KR tático trimestral

### ❌ NÃO IMPLEMENTADO / PRECISA DE AJUSTES

#### 1. Objetivos de Longo Prazo
- ❌ **CRÍTICO**: 10 anos e 5 anos são OBRIGATÓRIOS no código atual
  - Linha 905: `const longTermCanSave = so10Text.trim().length >= 18 && so5Text.trim().length >= 18 && so2Text.trim().length >= 18;`
  - **Requisito**: 10 e 5 anos devem ser OPCIONAIS, apenas 2 anos é obrigatório

#### 2. Objetivos Anuais
- ❌ Limite de KRs: código permite 1-4, mas requisito diz "pelo menos 1" (sem limite máximo especificado)
  - Validação atual: `if (o.krs.length < 1)` e `if (o.krs.length > 4)`
  - **Ajuste**: Remover limite máximo de 4 KRs

#### 3. Objetivos Trimestrais Estratégicos (Tier 1)
- ❌ **CRÍTICO**: Limite de KRs está em 2-4, mas requisito é 1-5
  - Validação atual: `if (o.krs.length < 2)` e `if (o.krs.length > 4)`
  - **Ajuste**: Mudar para mínimo 1, máximo 5
- ❌ **CRÍTICO**: Não há separação visual clara entre estratégicos (Tier 1) e táticos (Tier 2)
  - Etapa 4 mistura ambos os tipos
  - **Ajuste**: Separar em Etapa 4 (Estratégicos) e Etapa 5 (Táticos)

#### 4. Objetivos Trimestrais Táticos (Tier 2)
- ❌ Limite de KRs: código permite 1-4, mas requisito é 1-5
  - Validação atual: `if (o.krs.length < 1)` e `if (o.krs.length > 4)`
  - **Ajuste**: Mudar máximo para 5
- ❌ Indicadores de Performance: não implementados para Tier 2
  - **Ajuste**: Adicionar `PerformanceIndicatorEditor` para objetivos táticos

#### 5. Entregáveis
- ❌ **CRÍTICO**: Não há campos para anexos (links, comentários, documentos, arquivos)
- ❌ **CRÍTICO**: Não há hierarquia de 4 níveis (tarefa → lista → checklist → item)
- ❌ **CRÍTICO**: Não há log de alterações de datas visível no card
- ❌ Permissões: colaboradores podem editar/apagar apenas seus próprios entregáveis
  - **Ajuste**: Implementar verificação de permissões

#### 6. Indicadores de Performance (Geral)
- ⚠️ Implementado mas não integrado no Assistente Estratégico
  - Existe `PerformanceIndicatorEditor` mas não aparece nas etapas do wizard
  - **Ajuste**: Adicionar seção de PIs nas etapas 4 e 5

#### 7. Sincronização Mapa ↔ Assistente
- ⚠️ Parcialmente implementado
  - Ambos usam as mesmas funções do banco de dados
  - **Ajuste**: Garantir que mudanças em um reflitam imediatamente no outro (invalidação de queries)

## Resumo de Ajustes Necessários

### Prioridade ALTA
1. Tornar 10 e 5 anos opcionais (apenas 2 anos obrigatório)
2. Separar claramente Etapa 4 (Estratégicos) e Etapa 5 (Táticos)
3. Ajustar limites de KRs: estratégicos 1-5, táticos 1-5
4. Adicionar campos de anexos em entregáveis
5. Implementar hierarquia de 4 níveis em entregáveis

### Prioridade MÉDIA
6. Adicionar PerformanceIndicatorEditor nas etapas do wizard
7. Implementar log de alterações de datas visível no card
8. Implementar permissões de edição/apagar por entregável

### Prioridade BAIXA
9. Remover limite máximo de KRs anuais (deixar apenas mínimo 1)
10. Melhorar sincronização visual entre Mapa e Assistente

## Estrutura Sugerida para o Assistente

- **Etapa 1**: Fundamentos (já OK)
- **Etapa 2**: Longo Prazo (ajustar: 10 e 5 anos opcionais)
- **Etapa 3**: Anuais (ajustar: remover limite máximo de KRs)
- **Etapa 4**: Trimestrais Estratégicos Tier 1 (nova: separar dos táticos)
  - Moderador (admin)
  - 1-5 KRs estratégicos
  - 1-5 Indicadores de Performance
- **Etapa 5**: Trimestrais Táticos Tier 2 (nova: separar dos estratégicos)
  - Múltiplos responsáveis (heads/admins)
  - Múltiplos departamentos
  - 1-5 KRs táticos
  - 1-5 Indicadores de Performance
- **Etapa 6**: Entregáveis (ajustar: adicionar anexos e hierarquia)
- **Etapa 7**: Mapa (já OK)