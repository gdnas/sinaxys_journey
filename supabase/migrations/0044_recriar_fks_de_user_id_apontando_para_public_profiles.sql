
-- Dropar FK antiga que aponta para auth.users
ALTER TABLE work_item_comments 
DROP CONSTRAINT IF EXISTS work_item_comments_user_id_fkey;

-- Dropar FK antiga que aponta para auth.users  
ALTER TABLE work_item_events 
DROP CONSTRAINT IF EXISTS work_item_events_user_id_fkey;

-- Criar nova FK apontando para public.profiles
ALTER TABLE work_item_comments 
ADD CONSTRAINT work_item_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE work_item_events 
ADD CONSTRAINT work_item_events_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
