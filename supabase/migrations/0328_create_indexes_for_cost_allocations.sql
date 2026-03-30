-- Indexes for cost_allocations
CREATE INDEX idx_cost_allocations_company_id ON cost_allocations(company_id);
CREATE INDEX idx_cost_allocations_cost_item_id ON cost_allocations(cost_item_id);
CREATE INDEX idx_cost_allocations_department_id ON cost_allocations(department_id);