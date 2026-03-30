import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, AlertCircle, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { addSquadMember, removeSquadMember, updateSquadMember, type SquadMember } from "@/lib/squadsDb";
import { getUserAllocationSum } from "@/lib/squadsDb";
import { toast } from "sonner";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";

interface MemberRow extends SquadMember {
  tempId?: string;
}

interface SquadMembersEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  squadId: string;
  companyId: string;
  existingMembers: SquadMember[];
}

export function SquadMembersEditor({
  open,
  onOpenChange,
  squadId,
  companyId,
  existingMembers,
}: SquadMembersEditorProps) {
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<MemberRow[]>([]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
    enabled: open,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
    enabled: open,
  });

  // Initialize members from existingMembers
  useState(() => {
    const initMembers: MemberRow[] = existingMembers.map((m) => ({
      ...m,
      tempId: crypto.randomUUID(),
    }));
    setMembers(initMembers);
  });

  const availableProfiles = profiles.filter(
    (p) => !p.active && !members.some((m) => m.user_id === p.id)
  );

  const addMember = () => {
    setMembers([
      ...members,
      {
        id: crypto.randomUUID(),
        tempId: crypto.randomUUID(),
        company_id: companyId,
        squad_id: squadId,
        user_id: "",
        allocation_percentage: 100,
        role: "",
      },
    ]);
  };

  const removeMember = (tempId: string) => {
    const member = members.find((m) => m.tempId === tempId);
    if (member?.id) {
      // Existing member - need to delete from DB
      deleteMemberMutation.mutate(member.id);
    } else {
      // New member - just remove from state
      setMembers(members.filter((m) => m.tempId !== tempId));
    }
  };

  const updateMemberField = (
    tempId: string,
    field: keyof MemberRow,
    value: any
  ) => {
    setMembers(
      members.map((m) => (m.tempId === tempId ? { ...m, [field]: value } : m))
    );
  };

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await addSquadMember(squadId, userId, 100, "Membro");
    },
    onSuccess: () => {
      toast.success("Membro adicionado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar membro");
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await removeSquadMember(memberId);
    },
    onSuccess: () => {
      toast.success("Membro removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover membro");
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: { memberId: string; allocation: number; role?: string }) => {
      await updateSquadMember(data.memberId, data.allocation, data.role);
    },
    onSuccess: () => {
      toast.success("Alocação atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["squad", squadId] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar alocação");
    },
  });

  const getProfile = (userId: string) => profiles.find((p) => p.id === userId);
  const getDepartment = (deptId: string) => departments.find((d) => d.id === deptId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[color:var(--sinaxys-ink)]">
            Editar Membros do Squad
          </DialogTitle>
          <DialogDescription>
            Gerencie os membros e suas alocações neste squad cross-functional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-xl bg-[color:var(--sinaxys-tint)] p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              <div>
                <p className="font-medium text-[color:var(--sinaxys-ink)]">
                  A soma das alocações de um usuário em todos os squads não pode exceder 100%
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {members.map((member) => {
              const profile = getProfile(member.user_id);
              const department = getDepartment(profile?.department_id || "");
              const individualCost = profile?.monthly_cost_brl || 0;
              const squadCost = (individualCost * member.allocation_percentage) / 100;

              return (
                <div
                  key={member.tempId}
                  className="flex items-start gap-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || ""} />
                      <AvatarFallback className="bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        {(profile?.name || profile?.email || "").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">
                          {profile?.name || profile?.email || "Selecione um usuário"}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        {profile?.job_title || "Cargo não informado"}
                        {department && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {department.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start gap-6">
                    <div className="text-right">
                      <div className="mb-2">
                        <Label className="text-xs">Custo Individual</Label>
                        <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">
                          {individualCost > 0 ? brl(individualCost) : "—"}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`allocation-${member.tempId}`} className="text-xs">
                          Alocação %
                        </Label>
                        <Input
                          id={`allocation-${member.tempId}`}
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={member.allocation_percentage}
                          onChange={(e) =>
                            updateMemberField(member.tempId, "allocation_percentage", Number(e.target.value))
                          }
                          className="h-9 w-20 rounded-lg"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-muted-foreground">Custo no Squad</div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                          {squadCost > 0 ? brl(squadCost) : "—"}
                        </div>
                      </div>
                    </div>

                    {member.id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => removeMember(member.tempId!)}
                        disabled={deleteMemberMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {members.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum membro neste squad.
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addMember}
            className="w-full gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              // Save all updates
              const savePromises = members
                .filter((m) => m.id && !m.tempId)
                .map((member) => {
                  if (member.user_id) {
                    return updateMemberMutation.mutateAsync({
                      memberId: member.id,
                      allocation: member.allocation_percentage,
                      role: member.role,
                    });
                  }
                  return Promise.resolve();
                });

              // Save new members
              const newMembers = members.filter((m) => !m.id);
              for (const member of newMembers) {
                if (member.user_id) {
                  savePromises.push(
                    addMemberMutation.mutateAsync(member.user_id)
                  );
                }
              }

              if (savePromises.length === 0) {
                onOpenChange(false);
              }
            }}
            disabled={
              members.length === 0 ||
              (updateMemberMutation.isPending || addMemberMutation.isPending)
            }
            className="h-11 rounded-xl"
          >
            {updateMemberMutation.isPending || addMemberMutation.isPending
              ? "Salvando..."
              : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
