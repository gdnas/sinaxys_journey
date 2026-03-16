# Módulo Gestão de Projetos - Fase 1

## Visão Geral

Este documento documenta a implementação da Fase 1 do módulo "Gestão de Projetos" da plataforma Kairoos.

**Data:** 2025
**Versão:** 1.0
**Status:** Concluído

---

## Objetivos da Fase 1

A Fase 1 foca na preparação da infraestrutura básica do módulo, sem implementar funcionalidades complexas de negócio. Os principais objetivos são:

1. ✅ Estrutura de navegação e menu
2. ✅ Rotas básicas
3. ✅ Páginas placeholder com layout consistente
4. ✅ Estrutura de banco de dados (tabelas, índices, triggers)
5. ✅ Tipos TypeScript para os modelos de dados
6. ✅ Traduções básicas (PT, EN, DE)

---

## O que NÃO foi implementado nesta fase

- ❌ RLS (Row Level Security) complexa - políticas básicas apenas
- ❌ Dashboard funcional
- ❌ Criação e edição de projetos
- ❌ Criação e edição de tarefas
- ❌ Filtros avançados
- ❌ Drag and drop
- ❌ Timeline/Gantt
- ❌ Vínculo com OKR
- ❌ Automatizações
- ❌ Notificações

---

## Arquitetura Implementada

### 1. Navegação e Menu

#### Localização no Menu Lateral
O módulo "Gestão de Projetos" foi posicionado imediatamente abaixo do módulo "OKR" no menu lateral.

#### Estrutura
```
Gestão de Projetos (PROJECTS)
├── Página Inicial (/app/projetos/dashboard)
├── Projetos (/app/projetos/lista)
└── Tarefas (/app/projetos/tarefas)
```

#### Arquivo Modificado
- `src/components/AppShell.tsx`
  - Adicionado grupo de navegação com ícone `CalendarClock`
  - Adicionado controle do módulo `PROJECTS`
  - Adicionado verificação `allowProjects` para habilitar/desabilitar módulo

#### Traduções Adicionadas
- `src/i18n.ts`
  - `nav.projects.group`: "Gestão de Projetos" / "Project Management" / "Projektmanagement"
  - `nav.projects.home`: "Página Inicial" / "Home" / "Startseite"
  - `nav.projects.list`: "Projetos" / "Projects" / "Projekte"
  - `nav.projects.tasks`: "Tarefas" / "Tasks" / "Aufgaben"

---

### 2. Rotas

#### Rotas Criadas
```
/app/projetos         → Redireciona para /app/projetos/dashboard
/app/projetos/dashboard → Página inicial do módulo
/app/projetos/lista    → Listagem de projetos
/app/projetos/tarefas  → Listagem de tarefas
```

#### Arquivo Modificado
- `src/App.tsx`
  - Importadas as 4 novas páginas
  - Adicionadas rotas com autenticação e verificação de módulo
  - Todas as rotas exigem role: `["ADMIN", "HEAD", "COLABORADOR"]`

---

### 3. Páginas Placeholder

Todas as páginas seguem o padrão visual do sistema Kairoos:
- Layout consistente com o módulo OKR
- Cores do tema `sinaxys`
- Cards arredondados (`rounded-3xl`)
- Breadcrumbs funcionais
- Empty states amigáveis
- Badges informativos
- Aviso de "Fase 1 - Módulo em desenvolvimento"

#### Arquivos Criados

##### `src/pages/ProjetosHome.tsx`
- Página de redirecionamento
- Redireciona automaticamente para `/app/projetos/dashboard`

##### `src/pages/ProjetosDashboard.tsx`
- **Título:** Gestão de Projetos
- **Descrição:** Gerencie projetos, tarefas e acompanhe o progresso da sua equipe
- **Cards de Acesso Rápido:**
  - Projetos: Link para lista de projetos
  - Tarefas: Link para lista de tarefas
  - Visão Geral: Placeholder (em breve)
- **Empty State:** Mensagem amigável quando não há projetos

##### `src/pages/ProjetosLista.tsx`
- **Título:** Projetos
- **Descrição:** Visualize e gerencie todos os projetos da sua equipe
- **Barra de Busca:** Placeholder (desabilitado)
- **Botão de Filtros:** Placeholder (desabilitado)
- **Empty State:** Mensagem amigável quando não há projetos
- **Aviso de Fase 1:** Banner informativo

##### `src/pages/ProjetosTarefas.tsx`
- **Título:** Tarefas
- **Descrição:** Acompanhe e gerencie tarefas individuais
- **Cards de Status:**
  - Backlog: Contador (0)
  - Em Andamento: Contador (0)
  - Concluídas: Contador (0)
- **Barra de Busca:** Placeholder (desabilitado)
- **Badges de Filtro:** Todas, Minhas, Prioritárias (placeholder)
- **Empty State:** Mensagem amigável quando não há tarefas
- **Aviso de Fase 1:** Banner informativo

---

### 4. Banco de Dados

#### Tabelas Criadas

##### `public.projects`
Tabela principal de projetos.

**Colunas:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `tenant_id` | UUID (NOT NULL) | ID da empresa (multi-tenancy) |
| `name` | TEXT (NOT NULL) | Nome do projeto |
| `description` | TEXT | Descrição do projeto |
| `department_id` | UUID | ID do departamento |
| `owner_user_id` | UUID (NOT NULL) | ID do usuário proprietário |
| `created_by_user_id` | UUID (NOT NULL) | ID do usuário criador |
| `visibility` | TEXT | Visibilidade: `public` ou `private` |
| `admin_private_mode` | TEXT | Modo privado: `null`, `admin_only`, `heads_only` |
| `status` | TEXT | Status: `not_started`, `on_track`, `at_risk`, `delayed`, `completed` |
| `start_date` | DATE | Data de início |
| `due_date` | DATE | Data de término |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Índices:**
- `idx_projects_tenant_id`: `tenant_id`
- `idx_projects_owner_user_id`: `owner_user_id`
- `idx_projects_status`: `status`

**Constraints:**
- `projects_visibility_check`: Verifica valores válidos de `visibility`
- `projects_admin_private_mode_check`: Verifica valores válidos de `admin_private_mode`
- `projects_status_check`: Verifica valores válidos de `status`

**Trigger:**
- `trigger_update_projects_updated_at`: Atualiza automaticamente `updated_at` em UPDATE

---

##### `public.project_members`
Tabela de membros do projeto.

**Colunas:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `tenant_id` | UUID (NOT NULL) | ID da empresa (multi-tenancy) |
| `project_id` | UUID (NOT NULL, FK) | ID do projeto |
| `user_id` | UUID (NOT NULL) | ID do usuário |
| `role_in_project` | TEXT | Papel: `member`, `owner`, `viewer`, `editor` |
| `created_at` | TIMESTAMPTZ | Data de criação |

**Índices:**
- `idx_project_members_project_id`: `project_id`
- `idx_project_members_user_id`: `user_id`

**Constraints:**
- `fk_project_members_project_id`: Foreign key para `projects.id` ON DELETE CASCADE
- `project_members_role_check`: Verifica valores válidos de `role_in_project`

---

##### `public.tasks`
Tabela de tarefas.

**Colunas:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `tenant_id` | UUID (NOT NULL) | ID da empresa (multi-tenancy) |
| `project_id` | UUID (FK) | ID do projeto (opcional) |
| `title` | TEXT (NOT NULL) | Título da tarefa |
| `description` | TEXT | Descrição da tarefa |
| `assignee_user_id` | UUID | ID do usuário responsável |
| `created_by_user_id` | UUID (NOT NULL) | ID do usuário criador |
| `priority` | TEXT | Prioridade: `low`, `medium`, `high`, `critical` |
| `status` | TEXT | Status: `backlog`, `todo`, `in_progress`, `review`, `done` |
| `due_date` | TIMESTAMPTZ | Data/hora de término |
| `start_date` | TIMESTAMPTZ | Data/hora de início |
| `completed_at` | TIMESTAMPTZ | Data/hora de conclusão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de última atualização |

**Índices:**
- `idx_tasks_tenant_id`: `tenant_id`
- `idx_tasks_project_id`: `project_id`
- `idx_tasks_assignee_user_id`: `assignee_user_id`
- `idx_tasks_status`: `status`

**Constraints:**
- `fk_tasks_project_id`: Foreign key para `projects.id` ON DELETE SET NULL
- `tasks_priority_check`: Verifica valores válidos de `priority`
- `tasks_status_check`: Verifica valores válidos de `status`

**Trigger:**
- `trigger_update_tasks_updated_at`: Atualiza automaticamente `updated_at` em UPDATE

---

#### RLS (Row Level Security)

**Status Fase 1:** Políticas básicas implementadas

Todas as tabelas têm RLS habilitado com políticas simples:
- **SELECT:** Permite acesso a todos os usuários autenticados
- **INSERT:** Permite inserção para todos os usuários autenticados
- **UPDATE:** Permite atualização para todos os usuários autenticados
- **DELETE:** Permite exclusão para todos os usuários autenticados

⚠️ **Importante:** Estas políticas DEVEM ser refinadas nas próximas fases para garantir segurança adequada. Atualmente, qualquer usuário autenticado pode acessar/modificar qualquer dado.

---

### 5. Tipos TypeScript

#### Arquivo Criado
- `src/lib/projectsDb.ts`

#### Tipos Definidos

**Enums:**
- `ProjectVisibility`: `"public" | "private"`
- `ProjectAdminPrivateMode`: `null | "admin_only" | "heads_only"`
- `ProjectStatus`: `"not_started" | "on_track" | "at_risk" | "delayed" | "completed"`
- `TaskPriority`: `"low" | "medium" | "high" | "critical"`
- `TaskStatus`: `"backlog" | "todo" | "in_progress" | "review" | "done"`
- `ProjectMemberRole`: `"member" | "owner" | "viewer" | "editor"`

**Database Rows:**
- `DbProject`: Linha da tabela projects
- `DbProjectMember`: Linha da tabela project_members
- `DbTask`: Linha da tabela tasks

**Input Types:**
- `CreateProjectInput`: Input para criação de projeto
- `UpdateProjectInput`: Input para atualização de projeto
- `CreateProjectMemberInput`: Input para criação de membro
- `CreateTaskInput`: Input para criação de tarefa
- `UpdateTaskInput`: Input para atualização de tarefa

**Output Types:**
- `ProjectWithDetails`: Projeto com dados expandidos (members, tasks)
- `TaskWithDetails`: Tarefa com dados expandidos (project, assignee)
- `ProjectStats`: Estatísticas de projetos

**Helper Types:**
- `ProjectFilters`: Filtros para listagem de projetos
- `TaskFilters`: Filtros para listagem de tarefas
- `ProjectSortBy`: Opções de ordenação de projetos
- `TaskSortBy`: Opções de ordenação de tarefas

---

## Próximos Passos (Fase 2)

A Fase 2 deve implementar:

1. **RLS Refinado**
   - Implementar políticas baseadas em `tenant_id`
   - Implementar verificação de permissões (owner, member, viewer)
   - Implementar controle de visibilidade (public/private)

2. **CRUD Básico**
   - Criação de projetos (formulário)
   - Edição de projetos
   - Exclusão de projetos
   - Listagem com filtros básicos

3. **CRUD de Tarefas**
   - Criação de tarefas
   - Edição de tarefas
   - Exclusão de tarefas
   - Mudança de status (drag and drop simples)

4. **Gerenciamento de Membros**
   - Adicionar membros ao projeto
   - Remover membros
   - Editar papéis

5. **Dashboard Básico**
   - Contadores de projetos por status
   - Contadores de tarefas por status
   - Lista de projetos recentes
   - Lista de tarefas próximas do vencimento

---

## Notas Importantes

### Multi-tenancy
Todas as tabelas possuem `tenant_id` para suportar arquitetura multi-tenant. As futuras queries DEVEM sempre filtrar por `tenant_id`.

### Trigger updated_at
O trigger `update_projects_updated_at()` foi criado para ambas as tabelas `projects` e `tasks`, atualizando automaticamente a coluna `updated_at` em operações de UPDATE.

### Ícones
Os ícones utilizados seguem a biblioteca `lucide-react`:
- Módulo: `CalendarClock`
- Projetos: `Layers`
- Tarefas: `CheckCircle2`
- Dashboard: `LayoutDashboard`

### Estilo Visual
Todas as páginas utilizam as variáveis de tema do Kairoos:
- Cor primária: `var(--sinaxys-primary)`
- Cor de fundo: `var(--sinaxys-bg)`
- Cor de destaque: `var(--sinaxys-tint)`
- Cor de texto: `var(--sinaxys-ink)`
- Cor de borda: `var(--sinaxys-border)`

---

## Checklist da Fase 1

- [x] Item de menu "Gestão de Projetos" adicionado abaixo de OKR
- [x] Subitens criados (Página Inicial, Projetos, Tarefas)
- [x] Rotas criadas (/app/projetos, /app/projetos/dashboard, /app/projetos/lista, /app/projetos/tarefas)
- [x] Páginas placeholder com layout consistente
- [x] Tabela projects criada com índices e constraints
- [x] Tabela project_members criada com índices e constraints
- [x] Tabela tasks criada com índices e constraints
- [x] Triggers updated_at criados
- [x] RLS habilitado (políticas básicas)
- [x] Tipos TypeScript criados em `projectsDb.ts`
- [x] Traduções adicionadas (PT, EN, DE)
- [x] Documentação markdown criada

---

## Contato e Suporte

Para dúvidas ou problemas relacionados a esta implementação:
- Consulte a documentação do Kairoos
- Verifique os arquivos de types em `src/lib/projectsDb.ts`
- Verifique as páginas em `src/pages/Projetos*.tsx`

---

**Fim da Documentação - Fase 1**
