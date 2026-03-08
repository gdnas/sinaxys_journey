-- Knowledge Base Module Migration
-- Creates tables, RLS policies, indexes, and helper functions for the knowledge base

-- ============================================
-- Knowledge Spaces (Collections)
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_spaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📁',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Knowledge Pages (Documents)
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE,
  parent_page_id UUID REFERENCES public.knowledge_pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  content JSONB DEFAULT '{"type":"doc","content":[]}',
  icon TEXT DEFAULT '📄',
  cover_image TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT knowledge_pages_slug_unique UNIQUE (slug)
);

-- ============================================
-- Knowledge Permissions
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  role_id TEXT CHECK (role_id IN ('ADMIN', 'HEAD', 'COLLABORADOR')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT knowledge_permissions_user_or_role CHECK (
    (user_id IS NOT NULL) OR (role_id IS NOT NULL)
  )
);

-- ============================================
-- Knowledge Page Versions
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_page_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  content_snapshot JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Knowledge Page Audit Log (stores old/new snapshots and changed fields)
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_page_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  old_snapshot JSONB,
  new_snapshot JSONB,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_fields JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Knowledge Page Comments
-- ============================================

CREATE TABLE IF NOT EXISTS public.knowledge_page_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.knowledge_pages(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.knowledge_page_comments(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  mentions TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Spaces indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_spaces_company ON public.knowledge_spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_spaces_name ON public.knowledge_spaces(name);

-- Pages indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_company ON public.knowledge_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_space ON public.knowledge_pages(space_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_parent ON public.knowledge_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_slug ON public.knowledge_pages(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_favorite ON public.knowledge_pages(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_created_by ON public.knowledge_pages(created_by);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_title_search ON public.knowledge_pages 
  USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_knowledge_pages_content_search ON public.knowledge_pages 
  USING GIN (to_tsvector('english', content::text));

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_permissions_page ON public.knowledge_permissions(page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_permissions_role ON public.knowledge_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_permissions_user ON public.knowledge_permissions(user_id);

-- Versions indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_page_versions_page ON public.knowledge_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_versions_created_at ON public.knowledge_page_versions(created_at DESC);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_page_audit_log_page ON public.knowledge_page_audit_log(page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_audit_log_changed_at ON public.knowledge_page_audit_log(changed_at DESC);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_page_comments_page ON public.knowledge_page_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_comments_parent ON public.knowledge_page_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_page_comments_company ON public.knowledge_page_comments(company_id);

-- ============================================
-- Updated At Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_knowledge_spaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_spaces_updated_at
  BEFORE UPDATE ON public.knowledge_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_spaces_updated_at();

CREATE OR REPLACE FUNCTION update_knowledge_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_pages_updated_at
  BEFORE UPDATE ON public.knowledge_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_pages_updated_at();

CREATE OR REPLACE FUNCTION update_knowledge_page_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_page_comments_updated_at
  BEFORE UPDATE ON public.knowledge_page_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_page_comments_updated_at();

-- ============================================
-- Helper Functions for Permission Checking
-- ============================================

-- Get current user's company_id from profile
CREATE OR REPLACE FUNCTION auth.company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user is admin or masteradmin
CREATE OR REPLACE FUNCTION is_admin_or_master()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'MASTERADMIN')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user can edit (admin, masteradmin, or head for their role)
CREATE OR REPLACE FUNCTION is_editor_or_master()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'MASTERADMIN')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has page access (view, edit, or admin)
CREATE OR REPLACE FUNCTION has_page_access(page_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_company_id UUID;
BEGIN
  -- Get user's role and company
  SELECT role, company_id INTO user_role, user_company_id
  FROM public.profiles WHERE id = auth.uid();
  
  -- MASTERADMIN has access to everything
  IF user_role = 'MASTERADMIN' THEN RETURN TRUE; END IF;
  
  -- Check if page belongs to same company
  IF NOT EXISTS (
    SELECT 1 FROM public.knowledge_pages 
    WHERE id = page_id AND company_id = user_company_id
  ) THEN RETURN FALSE; END IF;
  
  -- Check direct user permissions
  IF EXISTS (
    SELECT 1 FROM public.knowledge_permissions 
    WHERE page_id = page_id 
    AND user_id = auth.uid()
  ) THEN RETURN TRUE; END IF;
  
  -- Check role permissions
  IF EXISTS (
    SELECT 1 FROM public.knowledge_permissions 
    WHERE page_id = page_id 
    AND role_id = user_role
  ) THEN RETURN TRUE; END IF;
  
  -- Check parent permissions (recursive)
  IF EXISTS (
    WITH RECURSIVE page_tree AS (
      SELECT id, parent_page_id FROM public.knowledge_pages WHERE id = page_id
      UNION ALL
      SELECT p.id, p.parent_page_id 
      FROM public.knowledge_pages p
      INNER JOIN page_tree pt ON p.id = pt.parent_page_id
    )
    SELECT 1 FROM page_tree pt
    INNER JOIN public.knowledge_permissions kp ON kp.page_id = pt.id
    WHERE (kp.user_id = auth.uid() OR kp.role_id = user_role)
  ) THEN RETURN TRUE; END IF;
  
  -- ADMIN and HEAD have default access within their company
  IF user_role IN ('ADMIN', 'HEAD') THEN RETURN TRUE; END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user can edit a specific page
CREATE OR REPLACE FUNCTION can_edit_page(page_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_company_id UUID;
BEGIN
  -- Get user's role and company
  SELECT role, company_id INTO user_role, user_company_id
  FROM public.profiles WHERE id = auth.uid();
  
  -- MASTERADMIN can edit everything
  IF user_role = 'MASTERADMIN' THEN RETURN TRUE; END IF;
  
  -- Check if page belongs to same company
  IF NOT EXISTS (
    SELECT 1 FROM public.knowledge_pages 
    WHERE id = page_id AND company_id = user_company_id
  ) THEN RETURN FALSE; END IF;
  
  -- Check for edit or admin permission
  IF EXISTS (
    SELECT 1 FROM public.knowledge_permissions 
    WHERE page_id = page_id 
    AND permission_level IN ('edit', 'admin')
    AND (user_id = auth.uid() OR role_id = user_role)
  ) THEN RETURN TRUE; END IF;
  
  -- Check parent permissions (recursive)
  IF EXISTS (
    WITH RECURSIVE page_tree AS (
      SELECT id, parent_page_id FROM public.knowledge_pages WHERE id = page_id
      UNION ALL
      SELECT p.id, p.parent_page_id 
      FROM public.knowledge_pages p
      INNER JOIN page_tree pt ON p.id = pt.parent_page_id
    )
    SELECT 1 FROM page_tree pt
    INNER JOIN public.knowledge_permissions kp ON kp.page_id = pt.id
    WHERE kp.permission_level IN ('edit', 'admin')
    AND (kp.user_id = auth.uid() OR kp.role_id = user_role)
  ) THEN RETURN TRUE; END IF;
  
  -- ADMIN can edit within their company
  IF user_role = 'ADMIN' THEN RETURN TRUE; END IF;
  
  -- COLLABORADOR cannot edit by default
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.knowledge_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_page_comments ENABLE ROW LEVEL SECURITY;

-- Spaces policies
CREATE POLICY "spaces_select_company" ON public.knowledge_spaces
  FOR SELECT USING (company_id = auth.company_id());

CREATE POLICY "spaces_insert_admin" ON public.knowledge_spaces
  FOR INSERT WITH CHECK (company_id = auth.company_id() AND is_admin_or_master());

CREATE POLICY "spaces_update_admin" ON public.knowledge_spaces
  FOR UPDATE USING (company_id = auth.company_id() AND is_admin_or_master());

CREATE POLICY "spaces_delete_admin" ON public.knowledge_spaces
  FOR DELETE USING (company_id = auth.company_id() AND is_admin_or_master());

-- Pages policies
CREATE POLICY "pages_select_company" ON public.knowledge_pages
  FOR SELECT USING (company_id = auth.company_id() AND has_page_access(id));

CREATE POLICY "pages_insert_editor" ON public.knowledge_pages
  FOR INSERT WITH CHECK (company_id = auth.company_id() AND is_editor_or_master());

CREATE POLICY "pages_update_editor" ON public.knowledge_pages
  FOR UPDATE USING (company_id = auth.company_id() AND can_edit_page(id));

CREATE POLICY "pages_delete_admin" ON public.knowledge_pages
  FOR DELETE USING (company_id = auth.company_id() AND is_admin_or_master());

-- Permissions policies
CREATE POLICY "permissions_select_company" ON public.knowledge_permissions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.knowledge_pages p
    WHERE p.id = page_id AND p.company_id = auth.company_id()
  ));

-- Allow the page creator OR admins to manage permissions for a page within the same company
CREATE POLICY "permissions_manage_admin_or_creator" ON public.knowledge_permissions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.knowledge_pages p
    WHERE p.id = page_id AND p.company_id = auth.company_id() AND (is_admin_or_master() OR p.created_by = auth.uid())
  ));

-- Versions policies
CREATE POLICY "versions_select_page_access" ON public.knowledge_page_versions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.knowledge_pages p
    WHERE p.id = page_id AND p.company_id = auth.company_id() AND has_page_access(p.id)
  ));

CREATE POLICY "versions_insert_on_update" ON public.knowledge_page_versions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.knowledge_pages p
    WHERE p.id = page_id AND p.company_id = auth.company_id() AND can_edit_page(p.id)
  ));

-- Comments policies
CREATE POLICY "comments_select_company" ON public.knowledge_page_comments
  FOR SELECT USING (company_id = auth.company_id() AND has_page_access(page_id));

CREATE POLICY "comments_insert_access" ON public.knowledge_page_comments
  FOR INSERT WITH CHECK (company_id = auth.company_id() AND has_page_access(page_id));

CREATE POLICY "comments_update_owner" ON public.knowledge_page_comments
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "comments_delete_owner_or_admin" ON public.knowledge_page_comments
  FOR DELETE USING (created_by = auth.uid() OR is_admin_or_master());

-- ============================================
-- Search Function
-- ============================================

CREATE OR REPLACE FUNCTION knowledge_search_pages(
  p_company_id UUID,
  p_query TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content JSONB,
  icon TEXT,
  space_id UUID,
  space_name TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.icon,
    p.space_id,
    s.name AS space_name,
    ts_rank(
      setweight(to_tsvector('english', p.title), 'A') ||
      setweight(to_tsvector('english', p.content::text), 'B'),
      plainto_tsquery('english', p_query)
    )::REAL
  FROM public.knowledge_pages p
  INNER JOIN public.knowledge_spaces s ON s.id = p.space_id
  WHERE p.company_id = p_company_id
    AND (
      to_tsvector('english', p.title) @@ plainto_tsquery('english', p_query) OR
      to_tsvector('english', p.content::text) @@ plainto_tsquery('english', p_query)
    )
  ORDER BY rank DESC, p.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- Auto-Create Version on Update and Audit Log
-- ============================================

CREATE OR REPLACE FUNCTION create_page_version_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Only create version & audit log if content or title changed
  IF (OLD.content IS DISTINCT FROM NEW.content) OR (OLD.title IS DISTINCT FROM NEW.title) THEN
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      v_changed_fields := array_append(v_changed_fields, 'title');
    END IF;
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      v_changed_fields := array_append(v_changed_fields, 'content');
    END IF;

    -- Record a snapshot (for revert / history)
    INSERT INTO public.knowledge_page_versions (page_id, content_snapshot, created_by)
    VALUES (NEW.id, NEW.content, auth.uid());

    -- Record an audit entry with old/new snapshots and changed fields
    INSERT INTO public.knowledge_page_audit_log (page_id, old_snapshot, new_snapshot, changed_by, changed_fields)
    VALUES (NEW.id, OLD.content, NEW.content, auth.uid(), to_jsonb(v_changed_fields));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run after updates
DROP TRIGGER IF EXISTS page_version_on_update ON public.knowledge_pages;
CREATE TRIGGER page_version_on_update
  AFTER UPDATE ON public.knowledge_pages
  FOR EACH ROW
  EXECUTE FUNCTION create_page_version_on_update();

-- ============================================
-- Auto-Generate Slug
-- ============================================

CREATE OR REPLACE FUNCTION generate_page_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'));
    NEW.slug := lower(regexp_replace(NEW.slug, '\s+', '-', 'g'));
    NEW.slug := lower(regexp_replace(NEW.slug, '-+', '-', 'g'));
    NEW.slug := trim(NEW.slug, '-');
    
    -- Ensure uniqueness by appending timestamp if needed
    IF EXISTS (SELECT 1 FROM public.knowledge_pages WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug := NEW.slug || '-' || extract(epoch from now())::bigint;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_slug_on_insert
  BEFORE INSERT ON public.knowledge_pages
  FOR EACH ROW
  EXECUTE FUNCTION generate_page_slug();