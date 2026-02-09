import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getCompany } from "@/lib/companiesDb";
import { listDepartments } from "@/lib/departmentsDb";
import { getProfile, updateProfile } from "@/lib/profilesDb";
import { roleLabel } from "@/lib/sinaxys";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function Profile() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, refresh } = useAuth();

  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!user) return null;

  const { data: me } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: () => getProfile(user.id),
  });

  const { data: company } = useQuery({
    queryKey: ["company", user.companyId],
    queryFn: () => (user.companyId ? getCompany(user.companyId) : Promise.resolve(null)),
    enabled: !!user.companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", user.companyId],
    queryFn: () => listDepartments(user.companyId!),
    enabled: !!user.companyId,
  });

  const deptName = useMemo(() => {
    if (!me?.department_id) return null;
    return departments.find((d) => d.id === me.department_id)?.name ?? null;
  }, [me?.department_id, departments]);

  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? user.name);
    setAvatarUrl(me.avatar_url ?? "");
    setPhone(me.phone ?? "");
  }, [me?.id]);

  const dirty = useMemo(() => {
    const baseName = me?.name ?? user.name;
    const baseAvatar = me?.avatar_url ?? "";
    const basePhone = me?.phone ?? "";
    return name.trim() !== baseName || avatarUrl.trim() !== baseAvatar || phone.trim() !== basePhone;
  }, [name, avatarUrl, phone, me, user.name]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Minha área</div>
            <p className="mt-1 text-sm text-muted-foreground">Seu perfil vem de public.profiles (Supabase).</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {roleLabel(user.role)}
              </Badge>
              {company?.name ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {company.name}
                </Badge>
              ) : null}
              {deptName ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {deptName}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <UserRound className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-[color:var(--sinaxys-border)]">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                {initials(name || user.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{user.email}</div>
              <div className="mt-1 text-xs text-muted-foreground">ID: {user.id}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = String(reader.result ?? "");
                  setAvatarUrl(dataUrl);
                  toast({ title: "Foto carregada", description: "Agora é só salvar." });
                };
                reader.readAsDataURL(file);
              }}
            />
            <Button variant="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
              Enviar foto
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/password">
                <KeyRound className="mr-2 h-4 w-4" />
                Alterar senha
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input className="h-11 rounded-xl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Celular</Label>
            <Input className="h-11 rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+55 11 9…" />
          </div>

          <div className="grid gap-2">
            <Label>Avatar URL (opcional)</Label>
            <Input className="h-11 rounded-xl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">Alterações salvam em public.profiles.</div>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!dirty || saving || name.trim().length < 2}
              onClick={async () => {
                try {
                  setSaving(true);
                  await updateProfile(user.id, {
                    name: name.trim(),
                    phone: phone.trim() || null,
                    avatar_url: avatarUrl.trim() || null,
                  } as any);

                  await qc.invalidateQueries({ queryKey: ["profile", user.id] });
                  await refresh();
                  toast({ title: "Perfil atualizado" });
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
