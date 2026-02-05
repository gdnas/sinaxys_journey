import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Company, Role, User } from "@/lib/domain";
import { mockDb } from "@/lib/mockDb";
import { roleLabel } from "@/lib/sinaxys";

function toMoneyNumber(v: string) {
  const cleaned = v.replace(/[^0-9.,-]/g, "").replaceAll(".", "").replace(",", ".");
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export function UserDetailsDialog({
  open,
  onOpenChange,
  viewerRole,
  viewerCompanyId,
  companies,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: Role;
  viewerCompanyId?: string | null;
  companies: Company[];
  user: User | null;
  onSaved: () => void;
}) {
  const canEditCompany = viewerRole === "MASTERADMIN";
  const allowedRoles: Role[] = viewerRole === "MASTERADMIN"
    ? ["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]
    : ["ADMIN", "HEAD", "COLABORADOR"];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("COLABORADOR");
  const [companyId, setCompanyId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [active, setActive] = useState(true);

  const [phone, setPhone] = useState("");
  const [monthlyCostBRL, setMonthlyCostBRL] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [contractUrl, setContractUrl] = useState("");
  const [managerId, setManagerId] = useState<string>("__none__");

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setRole(user.role);
    setCompanyId(user.companyId ?? companies[0]?.id ?? "");
    setDepartmentId(user.departmentId ?? "");
    setActive(!!user.active);

    setPhone(user.phone ?? "");
    setMonthlyCostBRL(user.monthlyCostBRL ? String(user.monthlyCostBRL) : "");
    setAvatarUrl(user.avatarUrl ?? "");
    setContractUrl(user.contractUrl ?? "");
    setManagerId(user.managerId ?? "__none__");
  }, [user?.id]);

  const effectiveCompanyId = useMemo(() => {
    if (role === "MASTERADMIN") return undefined;
    if (!canEditCompany) return viewerCompanyId ?? undefined;
    return companyId || undefined;
  }, [role, canEditCompany, viewerCompanyId, companyId]);

  const departments = useMemo(() => {
    if (!effectiveCompanyId) return [];
    return mockDb.getDepartments(effectiveCompanyId).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [effectiveCompanyId, open]);

  useEffect(() => {
    // ensure departmentId is valid when role/company changes
    if (role === "HEAD" || role === "COLABORADOR") {
      if (departments.length === 0) return;
      if (!departmentId || !departments.some((d) => d.id === departmentId)) {
        setDepartmentId(departments[0]?.id ?? "");
      }
    } else {
      if (departmentId) setDepartmentId("");
    }
  }, [role, effectiveCompanyId, departments.length]);

  const managerOptions = useMemo(() => {
    if (!effectiveCompanyId || role === "MASTERADMIN") return [] as User[];
    const all = mockDb.getUsers(effectiveCompanyId);
    return all
      .filter((u) => u.active && u.id !== user?.id)
      .filter((u) => u.role === "ADMIN" || u.role === "HEAD")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [effectiveCompanyId, role, user?.id, open]);

  useEffect(() => {
    if (role === "MASTERADMIN") {
      setManagerId("__none__");
      return;
    }
    if (!managerId) setManagerId("__none__");
  }, [role]);

  const companyLabel = (cid?: string) => companies.find((c) => c.id === cid)?.name ?? "—";

  const isReady = !!user;
  const canSave = isReady && name.trim().length >= 3 && email.trim().includes("@");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[94vw] rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Usuário — detalhes</DialogTitle>
        </DialogHeader>

        {!user ? (
          <div className="text-sm text-muted-foreground">Usuário não encontrado.</div>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nome</Label>
                <Input className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input className="h-11 rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Papel</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Ativo</Label>
                <div className="flex h-11 items-center justify-between rounded-xl border border-[color:var(--sinaxys-border)] bg-white px-3">
                  <div className="text-sm text-muted-foreground">Acesso ao sistema</div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              </div>

              {canEditCompany ? (
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Empresa</Label>
                  <Select
                    value={role === "MASTERADMIN" ? "__none__" : companyId}
                    onValueChange={(v) => setCompanyId(v)}
                    disabled={role === "MASTERADMIN"}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {role === "MASTERADMIN" ? <SelectItem value="__none__">—</SelectItem> : null}
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Empresa</Label>
                  <div className="h-11 rounded-xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/35 px-3 py-2 text-sm text-[color:var(--sinaxys-ink)]">
                    {companyLabel(effectiveCompanyId)}
                  </div>
                </div>
              )}

              {role === "HEAD" || role === "COLABORADOR" ? (
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Departamento</Label>
                  <Select value={departmentId || departments[0]?.id || ""} onValueChange={setDepartmentId}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {role !== "MASTERADMIN" ? (
              <>
                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Reporta para</Label>
                    <Select value={managerId} onValueChange={setManagerId}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem gestor (topo)</SelectItem>
                        {managerOptions.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} — {roleLabel(m.role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Custo mensal (R$)</Label>
                    <Input
                      className="h-11 rounded-xl"
                      inputMode="decimal"
                      placeholder="Ex.: 9500"
                      value={monthlyCostBRL}
                      onChange={(e) => setMonthlyCostBRL(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input className="h-11 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 99999-0000" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Avatar URL</Label>
                    <Input className="h-11 rounded-xl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Contrato URL</Label>
                  <Input className="h-11 rounded-xl" value={contractUrl} onChange={(e) => setContractUrl(e.target.value)} />
                </div>
              </>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            disabled={!canSave}
            onClick={() => {
              if (!user) return;

              const nextCompanyId = role === "MASTERADMIN" ? undefined : effectiveCompanyId;
              const nextDeptId = role === "HEAD" || role === "COLABORADOR" ? departmentId || undefined : undefined;

              mockDb.updateUserAdmin(user.id, {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role,
                companyId: nextCompanyId,
                departmentId: nextDeptId,
                active,
              });

              if (role !== "MASTERADMIN") {
                mockDb.updateUserProfile(user.id, {
                  phone,
                  avatarUrl,
                  contractUrl,
                });
                mockDb.updateUserCompensation(user.id, {
                  monthlyCostBRL: toMoneyNumber(monthlyCostBRL),
                });
                mockDb.updateUserManager(user.id, managerId === "__none__" ? null : managerId);
              }

              onSaved();
              onOpenChange(false);
            }}
          >
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
