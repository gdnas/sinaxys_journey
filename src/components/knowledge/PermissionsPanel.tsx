"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Users, Plus, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { listPermissions, createKnowledgePermission, deleteKnowledgePermission } from "@/lib/knowledgeDb";
import { useState } from "react";

export default function PermissionsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<"view" | "edit" | "admin">("view");
  const [resourceId, setResourceId] = useState("");
  const [resourceType, setResourceType] = useState<string>("track");

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => listPermissions(),
  });

  const filteredPermissions = permissions.filter((p) =>
    search
      ? ((p.title ?? "").toLowerCase().includes(search.toLowerCase()) || (p.role_id ?? "").toLowerCase().includes(search.toLowerCase()) || (p.user_id ?? "").toLowerCase().includes(search.toLowerCase()))
      : true
  );

  const createMutation = useMutation({
    mutationFn: ({ resourceId, resourceType, title, role, permissionLevel }: { resourceId: string; resourceType: string; title: string; role: string; permissionLevel: string }) =>
      createKnowledgePermission({
        page_id: resourceId,
        role_id: role === "all" ? null : role,
        user_id: null,
        permission_level: permissionLevel as "view" | "edit" | "admin",
        title,
        resource_type: resourceType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
      setOpen(false);
      setTitle("");
      setPermissionLevel("view");
      setResourceId("");
      setResourceType("track");
      toast({ title: "Permissão criada" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (permissionId: string) =>
      deleteKnowledgePermission(permissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permissions"] });
      toast({ title: "Permissão removida" });
    },
  });

  return (
    <div className="grid gap-6">
      <Card className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Gerenciar Permissões</div>
            <p className="mt-1 text-sm text-muted-foreground">Configure quem pode ver e editar trilhas e páginas.</p>
          </div>
          <Button
            className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={() => {
              setTitle("");
              setPermissionLevel("view");
              setResourceId("");
              setResourceType("track");
              setOpen(true);
            }}
          >
            <span className="sr-only">Fechar</span>
            <Plus className="mr-2 h-4 w-4" />
            Nova permissão
          </Button>
        </div>
      </Card>

      <Card className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Permissões</div>
            <p className="mt-1 text-sm text-muted-foreground">{isLoading ? "Carregando…" : `${filteredPermissions.length} permissões`}</p>
          </div>
          <div className="relative w-full md:w-[300px]">
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
                <Search />
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome de permissão, role ou recurso…"
                className="h-11 w-full rounded-xl pl-9"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
          {filteredPermissions.length > 0 ? (
            <div className="space-y-2">
              {filteredPermissions.map((permission) => (
                <div key={permission.id} className="flex items-start justify-between gap-3 bg-white border rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{permission.title ?? "Permissão"}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {permission.resource_type ?? ""}
                      {permission.user_id ? ` • ${permission.user_id}` : ""}
                      {permission.role_id ? ` • ${permission.role_id}` : ""}
                      {permission.permission_level}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-destructive"
                    onClick={() => deleteMutation.mutate(permission.id)}
                    title="Remover permissão"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              Nenhuma permissão encontrada
            </div>
          )}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(v) => {
        if (!v) {
          setTitle("");
          setPermissionLevel("view");
          setResourceId("");
          setResourceType("track");
        }
      }}>
        <DialogContent className="max-h-[80vh] max-w-[500px] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{title ? "Editar permissão" : "Nova permissão"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Acesso à trilha de Marketing"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={permissionLevel} onValueChange={(v: string) => setPermissionLevel(v as "view" | "edit" | "admin")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Visualizar</SelectItem>
                  <SelectItem value="edit">Editar</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tipo de Recurso</Label>
              <Select value={resourceType} onValueChange={(v: string) => setResourceType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="track">Trilha</SelectItem>
                  <SelectItem value="page">Página</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Selecionar Recurso</Label>
              <Input
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                placeholder="ID da trilha ou página"
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!title.trim() || !resourceId || createMutation.isPending}
              onClick={() => {
                if (title && resourceId) {
                  createMutation.mutate({
                    resourceId,
                    resourceType,
                    title,
                    role: permissionLevel === "admin" ? "all" : permissionLevel,
                    permissionLevel,
                  });
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}