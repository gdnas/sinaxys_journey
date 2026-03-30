-- Indexes for squads
CREATE INDEX idx_squads_company_active ON squads(company_id, active);
CREATE INDEX idx_squads_owner_user_id ON squads(owner_user_id);