-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_comments ENABLE ROW LEVEL SECURITY;

-- Políticas para company_announcements

-- SELECT: Membros da empresa podem ver recados da empresa toda ou do seu time
CREATE POLICY "announcements_select_company" ON public.company_announcements
FOR SELECT TO authenticated
USING (
  is_member_of_company(company_id)
);

-- INSERT: Admin pode publicar para empresa ou qualquer time; Head pode publicar apenas para seu time
CREATE POLICY "announcements_insert_admin" ON public.company_announcements
FOR INSERT TO authenticated
WITH CHECK (
  (is_admin_of_company(company_id)) OR
  (is_masteradmin())
);

CREATE POLICY "announcements_insert_head" ON public.company_announcements
FOR INSERT TO authenticated
WITH CHECK (
  scope = 'team' AND
  is_head_of_department(team_id) AND
  is_member_of_company(company_id)
);

-- UPDATE: Apenas o autor ou admin/master da empresa
CREATE POLICY "announcements_update_author" ON public.company_announcements
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY "announcements_update_admin" ON public.company_announcements
FOR UPDATE TO authenticated
USING (
  is_admin_of_company(company_id) OR is_masteradmin()
)
WITH CHECK (
  is_admin_of_company(company_id) OR is_masteradmin()
);

-- DELETE: Apenas admin/master
CREATE POLICY "announcements_delete_admin" ON public.company_announcements
FOR DELETE TO authenticated
USING (
  is_admin_of_company(company_id) OR is_masteradmin()
);

-- Políticas para company_announcement_reads

-- SELECT: Usuário pode ver suas próprias leituras
CREATE POLICY "reads_select_self" ON public.company_announcement_reads
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- INSERT: Membro da empresa pode marcar como lido
CREATE POLICY "reads_insert_member" ON public.company_announcement_reads
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  is_member_of_company(
    (SELECT company_id FROM public.company_announcements WHERE id = announcement_id)
  )
);

-- DELETE: Usuário pode remover sua leitura
CREATE POLICY "reads_delete_self" ON public.company_announcement_reads
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Políticas para birthday_events

-- SELECT: Membros da empresa podem ver eventos de aniversário
CREATE POLICY "birthday_events_select_company" ON public.birthday_events
FOR SELECT TO authenticated
USING (is_member_of_company(company_id));

-- INSERT/UPDATE/DELETE: Apenas via edge function ou admin (não exposto via UI direta)
CREATE POLICY "birthday_events_insert_admin" ON public.birthday_events
FOR ALL TO authenticated
USING (is_masteradmin() OR is_admin_of_company(company_id));

-- Políticas para birthday_comments

-- SELECT: Membros da empresa podem ver comentários
CREATE POLICY "birthday_comments_select_company" ON public.birthday_comments
FOR SELECT TO authenticated
USING (
  is_member_of_company(
    (SELECT company_id FROM public.birthday_events WHERE id = birthday_event_id)
  )
);

-- INSERT: Membros da empresa podem comentar
CREATE POLICY "birthday_comments_insert_member" ON public.birthday_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_user_id = auth.uid() AND
  deleted_at IS NULL AND
  is_member_of_company(
    (SELECT company_id FROM public.birthday_events WHERE id = birthday_event_id)
  )
);

-- UPDATE: Autor pode atualizar seu comentário se não deletado
CREATE POLICY "birthday_comments_update_author" ON public.birthday_comments
FOR UPDATE TO authenticated
USING (
  author_user_id = auth.uid() AND
  deleted_at IS NULL
)
WITH CHECK (
  author_user_id = auth.uid() AND
  deleted_at IS NULL
);

-- DELETE: Autor ou admin pode deletar (soft delete)
CREATE POLICY "birthday_comments_delete_author" ON public.birthday_comments
FOR UPDATE TO authenticated
USING (
  author_user_id = auth.uid()
)
WITH CHECK (
  author_user_id = auth.uid() AND
  deleted_at = NOW()
);

CREATE POLICY "birthday_comments_delete_admin" ON public.birthday_comments
FOR UPDATE TO authenticated
USING (
  is_admin_of_company(
    (SELECT company_id FROM public.birthday_events WHERE id = birthday_event_id)
  ) OR is_masteradmin()
)
WITH CHECK (
  is_admin_of_company(
    (SELECT company_id FROM public.birthday_events WHERE id = birthday_event_id)
  ) OR is_masteradmin()
);