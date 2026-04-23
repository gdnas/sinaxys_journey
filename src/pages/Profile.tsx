import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, KeyRound, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabsList } from "@/components/ScrollableTabsList";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getCompany } from "@/lib/companiesDb";
import { brl } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import {
  createContractAttachment,
  createUserDocument,
  deleteContractAttachment,
  deleteUserDocument,
  listContractAttachments,
  listUserDocuments,
  uploadUserDocumentFile,
  createSignedUrlForStoragePath,
} from "@/lib/documentsDb";
import { getProfile, updateProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";
import { FinanceiroPanel } from "@/components/FinanceiroPanel";
import VacationRequests from "@/pages/VacationRequests";
import VacationApprovals from "@/pages/VacationApprovals";
import { useTranslation } from "react-i18next";
import { UserAssetsTab } from "@/components/assets/UserAssetsTab";
import MinimalLimitedProfile from "./MinimalLimitedProfile";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function isUrl(v: string) {
  const t = v.trim();
  if (!t) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

export default function Profile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  const { t } = useTranslation();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const docFileRef = useRef<HTMLInputElement | null>(null);

  const isMaster = user?.role === "MASTERADMIN";

  const canEditSensitive = user?.role === "ADMIN" || user?.role === "MASTERADMIN";
  const canEditCompanyFinance = user?.role === "ADMIN" || user?.role === "MASTERADMIN";
  const canApproveVacation = user?.role === "ADMIN" || user?.role === "HEAD";

  const { data: me } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => (user?.id ? getProfile(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
  });

  const { data: company } = useQuery({
    queryKey: ["company", user?.companyId],
    queryFn: () => (user?.companyId ? getCompany(user.companyId) : Promise.resolve(null)),
    enabled: !!user?.companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", user?.companyId],
    queryFn: () => (user?.companyId ? listDepartments(user.companyId!) : Promise.resolve([])),
    enabled: !!user?.companyId,
  });

  const deptName = useMemo(() => {
    if (!me?.department_id) return null;
    return departments.find((d) => d.id === me.department_id)?.name ?? null;
  }, [me?.department_id, departments]);

  const { data: attachments = [] } = useQuery({
    queryKey: ["contract-attachments", user?.companyId, user?.id],
    queryFn: () => (user?.companyId && user?.id ? listContractAttachments({ companyId: user.companyId, userId: user.id }) : Promise.resolve([])),
    enabled: !!user?.companyId && !!user?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["user-documents", user?.companyId, user?.id],
    queryFn: () => (user?.companyId && user?.id ? listUserDocuments({ companyId: user.companyId, userId: user.id }) : Promise.resolve([])),
    enabled: !!user?.companyId && !!user?.id,
  });

  if (!user) return null;
  if (!user.active) {
    return <MinimalLimitedProfile />;
  }

  const p = me as any;
  
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [birthDate, setBirthDate] = useState("");

  const [addressZip, setAddressZip] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCountry, setAddressCountry] = useState("Brasil");

  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [monthlyCost, setMonthlyCost] = useState<string>(user.monthlyCostBRL ? String(user.monthlyCostBRL) : "");
  const [contractUrl, setContractUrl] = useState(user.contractUrl ?? "");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? user.name);
    setAvatarUrl(me.avatar_url ?? "");
    setPhone(me.phone ?? "");
    setBirthDate(me.birth_date ?? "");

    setAddressZip(me.address_zip ?? "");
    setAddressLine1(me.address_line1 ?? "");
    setAddressLine2(me.address_line2 ?? "");
    setAddressNeighborhood(me.address_neighborhood ?? "");
    setAddressCity(me.address_city ?? "");
    setAddressState(me.address_state ?? "");
    setAddressCountry(me.address_country ?? "Brasil");

    setJobTitle(me.job_title ?? "");
    setMonthlyCost(typeof me.monthly_cost_brl === "number" ? String(me.monthly_cost_brl) : "");
    setContractUrl(me.contract_url ?? "");
  }, [me?.id]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t('profile.area_title')}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t('profile.area_desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}