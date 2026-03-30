-- Indexes for cost_items
CREATE INDEX idx_cost_items_company_active ON cost_items(company_id, active);
CREATE INDEX idx_cost_items_owner_department ON cost_items(owner_department_id);