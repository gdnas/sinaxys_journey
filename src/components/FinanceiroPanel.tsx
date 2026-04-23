import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  Building2,
  Calendar,
  Copy,
  CreditCard,
  FileDown,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Save,
  Trash2,
  Upload,
} from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function statusBadge(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAGA") return { label: "Paga", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" };
  if (s === "APROVADA") return { label: "Aprovada", className: "bg-sky-50 text-sky-700 hover:bg-sky-50" };
  if (s === "REJEITADA") return { label: "Rejeitada", className: "bg-rose-50 text-rose-700 hover:bg-rose-50" };
  if (s === "EM_ANALISE") return { label: "Em análise", className: "bg-amber-50 text-amber-800 hover:bg-amber-50" };
  return { label: "Enviada", className: "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]" };
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null | undefined;
}) {

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
            {value?.trim() ? value : "—"}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-xl"
        disabled={!value?.trim()}
        onClick={async () => {
          if (!value?.trim()) return;
          await copyToClipboard(value.trim());
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FinanceiroPanel({
  userId,
  companyId,
  canEditCompany,
}: {
  userId: string;
  companyId: string | null;
  canEditCompany: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { t } = useTranslation();

  return (
    <div className="grid gap-5">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          O painel financeiro completo será refinado nas próximas sprints.
        </div>
      </Card>
    </div>
  );
}