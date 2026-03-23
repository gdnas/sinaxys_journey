-- Criar tabela de likes em comentários de aniversário
CREATE TABLE IF NOT EXISTS public.birthday_comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  birthday_comment_id UUID NOT NULL REFERENCES public.birthday_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(birthday_comment_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.birthday_comment_likes ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "likes_select_company" ON public.birthday_comment_likes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.birthday_comments bc
    JOIN public.birthday_events be ON bc.birthday_event_id = be.id
    WHERE bc.id = birthday_comment_likes.birthday_comment_id
    AND is_member_of_company(be.company_id)
  )
);

CREATE POLICY "likes_insert_member" ON public.birthday_comment_likes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.birthday_comments bc
    JOIN public.birthday_events be ON bc.birthday_event_id = be.id
    WHERE bc.id = birthday_comment_likes.birthday_comment_id
    AND is_member_of_company(be.company_id)
  )
);

CREATE POLICY "likes_delete_self" ON public.birthday_comment_likes
FOR DELETE TO authenticated
USING (user_id = auth.uid());