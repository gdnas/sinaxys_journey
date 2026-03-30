-- Indexes for squad_members
CREATE INDEX idx_squad_members_company_id ON squad_members(company_id);
CREATE INDEX idx_squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX idx_squad_members_user_id ON squad_members(user_id);