# Contract Tests

Este diretório contém testes de contrato que validam o formato (shape) dos tipos de dados retornados pelas queries do Supabase.

## Objetivo

Evitar regressões onde um `.select()` do Supabase não retorna todos os campos que o tipo TypeScript assume que retorna. Isso é importante pois o TypeScript não valida em tempo de execução.

## Estrutura

Cada arquivo de teste:
- Importa o tipo relevante (ex: `PublicProfileRow`)
- Define um type guard que valida todos os campos essenciais
- Tem casos de teste para:
  1. Objetos inválidos (faltando campos) - devem falhar
  2. Objetos válidos - devem passar

## Adicionando novos contract tests

1. Crie um arquivo em `src/lib/__tests__/contracts/`
2. Siga o padrão dos arquivos existentes
3. Valide pelo menos os campos que são usados no `.select()` das queries
4. Não dependa de rede - testes devem ser rápidos