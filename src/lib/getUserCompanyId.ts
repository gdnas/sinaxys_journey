export function getUserCompanyId(user: { companyId?: string; company_id?: string } | null | undefined) {
  return user?.companyId || user?.company_id;
}