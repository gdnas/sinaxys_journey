import { useMemo, useState } from "react";
import { UserPlus, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { Role } from "@/lib/domain";
import { roleLabel } from "@/lib/sinaxys";

export default function AdminUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, force] = useState(0);

  const departments = useMemo(() => mockDb.getDepartments(), []);
  const users = useMemo(() => mockDb.getUsers().slice().sort((a, b) => a.name.localeCompare(b.name)), [force]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("COLABORADOR");
  const [deptId, setDeptId] = useState<string>(departments[0]?.id ?? "");

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Admin — Usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">Cadastre colaboradores e heads. Simples, previsível e auditável.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Shield className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Base de usuários</div>
            <p className="mt-1 text-sm text-muted-foreground">Ative/desative acesso sem apagar histórico.</p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setName("");
                setEmail("");
                setRole("COLABORADOR");
                setDeptId(departments[0]?.id ?? "");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Criar usuário</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" placeholder="nome@sinaxys.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Papel</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                      <SelectItem value="HEAD">Head de Departamento</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role !== "ADMIN" ? (
                  <div className="grid gap-2">
                    <Label>Departamento</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
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
              <DialogFooter>
                <Button
                  className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={name.trim().length < 3 || email.trim().length < 6}
                  onClick={() => {
                    try {
                      mockDb.createUser({
                        name,
                        email,
                        role,
                        departmentId: role === "ADMIN" ? undefined : deptId,
                      });
                      setOpen(false);
                      force((x) => x + 1);
                    } catch (e) {
                      toast({
                        title: "Não foi possível criar",
                        description: e instanceof Error ? e.message : "Erro inesperado.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--sinaxys-border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-right">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const dept = u.departmentId ? departments.find((d) => d.id === u.departmentId) : undefined;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-[color:var(--sinaxys-ink)]">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {roleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dept?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={u.active}
                          onCheckedChange={(v) => {
                            mockDb.setUserActive(u.id, v);
                            force((x) => x + 1);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
