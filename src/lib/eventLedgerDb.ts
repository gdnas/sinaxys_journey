export type CompanyEventRow = {
  id: string;
  company_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
  created_by: string | null;
};