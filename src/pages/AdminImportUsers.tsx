import { UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ImportUsersPanel } from "@/components/admin/ImportUsersPanel";

export default function AdminImportUsers() {
  const { user } = useAuth();
  const companyId = user?.companyId ?? (user as any)?.company_id ?? null;

  if (!user || !["ADMIN", "MASTERADMIN"].includes(user.role) || !companyId) return null;

  return <ImportUsersPanel companyId={companyId} />;
}
