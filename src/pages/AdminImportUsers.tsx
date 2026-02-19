import { UploadCloud } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ImportUsersPanel } from "@/components/admin/ImportUsersPanel";

export default function AdminImportUsers() {
  const { user } = useAuth();

  if (!user || user.role !== "ADMIN" || !user.companyId) return null;

  return <ImportUsersPanel companyId={user.companyId} />;
}