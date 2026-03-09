"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  X, 
  Shield, 
  ShieldCheck, 
  Eye, 
  Edit, 
  Trash2 
} from "lucide-react";
import { toast } from "sonner";
import { 
  listKnowledgePermissions, 
  createKnowledgePermission, 
  deleteKnowledgePermission 
} from "@/lib/knowledgeDb";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listProfilePublic } from "@/lib/profilePublicDb";

type PermissionLevel = "view" | "edit" | "admin";

interface PermissionsPanelProps {
  pageId: string;
  companyId: string;
  pageOwnerId: string | null;
  onOpenChange?: (open: boolean) => void;
}

const permissionLevels: { value: PermissionLevel; label: string; description: string; color: string }[] = [
  { value: "view", label: "Visualizar", description: "Pode ver o conteúdo", color: "bg-blue-100 text-blue-700" },
  { value: "edit", label: "Editar", description: "Pode modificar o conteúdo", color: "bg-green-100 text-green-700" },
  { value: "admin", label: "Administrador", description: "Controle total da página", color: "bg-purple-100 text-purple-700" },
];

export function PermissionsPanel({ pageId, companyId, pageOwnerId, onOpenChange }: PermissionsPanelProps) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("view");

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await listKnowledgePermissions(pageId);
      setPermissions(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar permissões", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [pageId]);

  const loadUsers = async () => {
    try {
      const profiles = await listProfilePublic(companyId);
      return profiles.filter(p => p.active !== false);
    } catch (error: any) {
      toast.error("Erro ao carregar usuários", { description: error.message });
      return [];
    }
  };

  const users = await loadUsers();

  const handleAddPermission = async (level: PermissionLevel) => {
    try {
      setSaving(true);

      if (selectedUsers.length > 0) {
        for (const userId of selectedUsers) {
          await createKnowledgePermission({
            page_id: pageId,
            user_id: userId,
            permission_level: level,
          });
        }
      }

      if (selectedRoles.length > 0) {
        for (const roleId of selectedRoles) {
          await createKnowledgePermission({
            page_id: pageId,
            role_id: roleId,
            permission_level: level,
          });
        }
      }

      toast.success("Permissões adicionadas com sucesso");
      setSelectedUsers([]);
      setSelectedRoles([]);
      await loadPermissions();
    } catch (error: any) {
      toast.error("Erro ao adicionar permissões", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      setSaving(true);
      await deleteKnowledgePermission(permissionId);
      toast.success("Permissão removida");
      await loadPermissions();
    } catch (error: any) {
      toast.error("Erro ao remover permissão", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionLevel = (level: PermissionLevel) => {
    return permissionLevels.find(p => p.value === level);
  };

  const isOwner = currentUser?.id === pageOwnerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-xl font-bold text-[#20105B]">Gerenciar Permissões</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onOpenChange?.(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <TabsList className="flex flex-col h-full">
              <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-3 text-base">
                <Users className="w-4 h-4" />
                <span className="font-medium">Pessoas</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2 px-4 py-3 text-base">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">Departamentos</span>
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Permission Level Selector */}
                <div className="p-4 border-b bg-gray-50">
                  <p className="text-sm font-medium text-gray-600 mb-3">
                    Selecione o nível de permissão para adicionar:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {permissionLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setPermissionLevel(level.value)}
                        className={`
                          px-4 py-2 rounded-lg border-2 flex items-center gap-2 transition-all
                          ${permissionLevel === level.value 
                            ? 'border-[#6366F1] bg-[#6366F1] text-white' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          ${level.color}
                        `}>
                          {level.value === "view" && <Eye className="w-4 h-4" />}
                          {level.value === "edit" && <Edit className="w-4 h-4" />}
                          {level.value === "admin" && <Shield className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-medium">{level.label}</span>
                        {permissionLevel === level.value && <ShieldCheck className="w-4 h-4 text-white ml-1" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {permissionLevels.find(p => p.value === permissionLevel)?.description}
                  </p>
                </div>

                {/* Users List with Search */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b bg-white">
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar usuário..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20"
                      />
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                      {loading ? (
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                          ))}
                        </div>
                      ) : users.filter(user => {
                        // Don't show already added permissions in the list
                        const existingUserIds = permissions.filter(p => p.user_id).map(p => p.user_id);
                        return !existingUserIds.includes(user.id);
                      }).map((user) => (
                        <div 
                          key={user.id}
                          onClick={() => setSelectedUsers([...selectedUsers, user.id])}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${selectedUsers.includes(user.id) 
                              ? 'border-[#6366F1] bg-[#EEF2FF]' 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <Checkbox 
                            checked={selectedUsers.includes(user.id)}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedUsers([...selectedUsers, user.id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                              }
                            }}
                          />
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            {user.avatar_url ? (
                              <AvatarFallback>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#9333EA] text-white font-bold flex items-center justify-center">
                                  {user.name?.charAt(0)?.toUpperCase() || user.name?.charAt(0)}
                                </div>
                              </AvatarFallback>
                            ) : (
                              <img 
                                src={user.avatar_url} 
                                alt={user.name || user.email}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.job_title || user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Action Button */}
                  <div className="p-4 border-t bg-white">
                    <Button
                      onClick={() => handleAddPermission(permissionLevel)}
                      disabled={saving || selectedUsers.length === 0}
                      className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                          Adicionando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Conceder Permissões
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles" className="flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                {/* Permission Level Selector */}
                <div className="p-4 border-b bg-gray-50">
                  <p className="text-sm font-medium text-gray-600 mb-3">
                    Selecione o nível de permissão para adicionar:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {permissionLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setPermissionLevel(level.value)}
                        className={`
                          px-4 py-2 rounded-lg border-2 flex items-center gap-2 transition-all
                          ${permissionLevel === level.value 
                            ? 'border-[#6366F1] bg-[#6366F1] text-white' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          ${level.color}
                        `}>
                          {level.value === "view" && <Eye className="w-4 h-4" />}
                          {level.value === "edit" && <Edit className="w-4 h-4" />}
                          {level.value === "admin" && <Shield className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-medium">{level.label}</span>
                        {permissionLevel === level.value && <ShieldCheck className="w-4 h-4 text-white ml-1" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {permissionLevels.find(p => p.value === permissionLevel)?.description}
                  </p>
                </div>

                {/* Roles List */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 space-y-2 bg-white">
                    {["ADMIN", "HEAD", "COLLABORADOR"].map((role) => (
                      <button
                        key={role}
                        onClick={() => setSelectedRoles([...selectedRoles, role])}
                        className={`
                          flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all w-full
                          ${selectedRoles.includes(role) 
                            ? 'border-[#6366F1] bg-[#EEF2FF]' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <Checkbox 
                          checked={selectedRoles.includes(role)}
                          onChange={(checked) => {
                            if (checked) {
                              setSelectedRoles([...selectedRoles, role]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{role === "ADMIN" ? "Administrador" : role === "HEAD" ? "Gerente" : "Colaborador"}</p>
                          <p className="text-xs text-gray-500">A todos os usuários com essa função</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="p-4 border-t bg-white">
                    <Button
                      onClick={() => handleAddPermission(permissionLevel)}
                      disabled={saving || selectedRoles.length === 0}
                      className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                          Adicionando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Conceder Permissões
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
          </Tabs>

          {/* Current Permissions */}
          <div className="p-6 border-t bg-gray-50 max-h-[30vh] overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permissões Atuais
            </h3>
            {permissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Nenhuma permissão definida</p>
              </div>
            ) : (
              <ScrollArea className="h-[24vh]">
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div 
                      key={permission.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0
                          ${getPermissionLevel(permission.permission_level)?.color}
                        `}>
                          {permission.user_id ? (
                            <span className="text-lg">
                              {permission.user_id?.charAt(0)?.toUpperCase() || "U"}
                            </span>
                          ) : (
                            <Users className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {permission.user_id 
                              ? users.find(u => u.id === permission.user_id)?.name || "Usuário"
                              : roles.find(r => r === permission.role_id) || "Departamento"
                            }
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {getPermissionLevel(permission.permission_level)?.label}
                            </Badge>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {new Date(permission.created_at || "").toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePermission(permission.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
    </div>
  );
}