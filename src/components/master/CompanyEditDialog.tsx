import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { deleteCompany, updateCompany, type DbCompany } from "@/lib/companiesDb";

export function CompanyEditDialog({
  open,
  onOpenChange,
  company,
  isActive,
  onAfterDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  company: DbCompany | null;
  isActive: boolean;
  /** Called after a company is deleted so the parent can clear selection etc. */
  onAfterDelete: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!company) return;
    setName(company.name ?? "");
    setTagline(company.tagline ?? "");
  }, [company?.id]);

  const canSave = useMemo(() => !!company && name.trim().length >= 3, [company, name]);

  async function onSave() {
    if (!company) return;
    try {
      setSaving(true);
      await updateCompany(company.id, { name: name.trim(), tagline: tagline.trim() || null });
      await qc.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa atualizada" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!company) return;
    const ok = confirm(
      `Excluir a empresa "${company.name}"?\n\nAtenção: isso pode quebrar dados vinculados (perfis, módulos, OKRs, etc.).`,
    );
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteCompany(company.id);
      await qc.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "Empresa excluída" });
      onAfterDelete();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não foi possível excluir", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[color:var(--sinaxys-ink)]">
            <Pencil className="h-4 w-4" />
            Editar empresa
          </DialogTitle>
        </DialogHeader>

        {company ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                ID: <span className="ml-1 font-mono text-[11px]">{company.id}</span>
              </Badge>
              {isActive ? <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Ativa</Badge> : null}
            </div>

            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Tagline</Label>
              <Input className="h-11 rounded-xl" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Opcional" />
            </div>

            <Separator />

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Zona de risco</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Excluir empresa normalmente é irreversível e pode falhar caso existam registros dependentes.
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50"
                  onClick={onDelete}
                  disabled={deleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir empresa
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Selecione uma empresa.</div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            disabled={!canSave || saving}
            onClick={onSave}
          >
            <Check className="mr-2 h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
