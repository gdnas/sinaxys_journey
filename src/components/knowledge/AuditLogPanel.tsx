"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  FileText, 
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  GitMerge
} from "lucide-react";
import { toast } from "sonner";
import { 
  listKnowledgePageAuditLogs,
  listKnowledgePageVersions,
  restoreKnowledgePageVersion 
} from "@/lib/knowledgeDb";
import { listProfilePublic } from "@/lib/profilePublicDb";
import { formatDistanceToNow } from "@/lib/utils";

interface AuditLogPanelProps {
  pageId: string;
  companyId: string;
  onOpenChange?: (open: boolean) => void;
}

export function AuditLogPanel({ pageId, companyId, onOpenChange }: AuditLogPanelProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [auditData, versionsData] = await Promise.all([
        listKnowledgePageAuditLogs(pageId),
        listKnowledgePageVersions(pageId),
      ]);
      setLogs(auditData || []);
      setVersions(versionsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar histórico", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pageId]);

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sistema";
    const user = profiles.find(p => p.id === userId);
    return user?.name || userId;
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case "title":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "content":
        return <FileText className="w-4 h-4 text-green-500" />;
      default:
        return <GitMerge className="w-4 h-4 text-purple-500" />;
    }
  };

  const getFieldLabel = (field: string) => {
    switch (field) {
      case "title":
        return "Título alterado";
      case "content":
        return "Conteúdo modificado";
      default:
        return "Alteração";
    }
  };

  const profiles = await listProfilePublic(companyId);

  const handleRestore = async (versionId: string) => {
    if (!confirm("Tem certeza que deseja restaurar esta versão? A versão atual será substituída.")) {
      return;
    }

    try {
      await restoreKnowledgePageVersion(pageId, versionId);
      toast.success("Versão restaurada com sucesso");
      await loadData();
    } catch (error: any) {
      toast.error("Erro ao restaurar versão", { description: error.message });
    }
  };

  const groupedLogs = logs.reduce((acc: any, log) => {
    const date = new Date(log.changed_at || log.created_at);
    const dateKey = date.toLocaleDateString('pt-BR');
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(log);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#6366F1]" />
            <h2 className="text-xl font-bold text-[#20105B]">Histórico de Alterações</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onOpenChange?.(false)}
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="h-full flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#6366F1]/30 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <FileText className="w-16 h-16 text-gray-300" />
                <p className="text-gray-500 mt-4">Nenhuma alteração registrada</p>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar: Versions List */}
                <div className="w-80 border-r bg-gray-50 overflow-hidden flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Versões Salvas</h3>
                    <p className="text-xs text-gray-500 mb-3">Clique para restaurar uma versão anterior</p>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                      {versions.map((version, idx) => (
                        <button
                          key={version.id}
                          onClick={() => handleRestore(version.id)}
                          className="w-full text-left p-3 rounded-lg border bg-white hover:bg-[#EEF2FF] transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">Versão #{versions.length - idx}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {new Date(version.created_at).toLocaleString('pt-BR', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Main: Audit Logs */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      {Object.entries(groupedLogs)
                        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                        .map(([date, dateLogs]) => (
                          <div key={date} className="space-y-3">
                            {/* Date Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-semibold text-gray-600">
                                {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {dateLogs.length} alteração{dateLogs.length !== 1 ? 'ões' : ''}
                              </Badge>
                            </div>

                            {/* Logs for this date */}
                            {dateLogs.map((log) => {
                              const isExpanded = expandedLogId === log.id;
                              const changedFields = log.changed_fields || [];
                              
                              return (
                                <div key={log.id} className="border rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-all"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <Avatar className="w-10 h-10 flex-shrink-0">
                                        {log.changed_by ? (
                                          <AvatarFallback>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#9333EA] text-white font-bold flex items-center justify-center">
                                              {getUserName(log.changed_by)?.charAt(0)?.toUpperCase() || "S"}
                                            </div>
                                          </AvatarFallback>
                                        ) : (
                                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-gray-400" />
                                          </div>
                                        )}
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{getUserName(log.changed_by)}</p>
                                        <div className="flex items-center gap-2">
                                          {changedFields.map((field) => (
                                            <React.Fragment key={field}>
                                              {getFieldIcon(field)}
                                              <Badge variant="secondary" className="text-xs">
                                                {getFieldLabel(field)}
                                              </Badge>
                                            </React.Fragment>
                                          ))}
                                          </div>
                                          <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(log.changed_at))}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <ChevronDown 
                                      className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                                        isExpanded ? 'rotate-180' : ''
                                      }`} 
                                    />
                                  </button>

                                  {/* Expanded Details */}
                                  {isExpanded && (
                                    <div className="p-4 bg-white border-t">
                                      <div className="space-y-3">
                                        {changedFields.map((field) => {
                                          const oldSnapshot = log.old_snapshot || {};
                                          const newSnapshot = log.new_snapshot || {};
                                          const hasDiff = JSON.stringify(oldSnapshot) !== JSON.stringify(newSnapshot);

                                          return (
                                            <div key={field} className="rounded-lg bg-gray-50 p-3">
                                              <div className="flex items-center gap-2 mb-2">
                                                {getFieldIcon(field)}
                                                <Badge variant="outline" className="text-xs">
                                                  Campo alterado
                                                </Badge>
                                              </div>
                                              {hasDiff && (
                                                <div className="grid grid-cols-2 gap-3 p-3 bg-white rounded border">
                                                  <div>
                                                    <p className="text-xs text-gray-500 mb-1">Anterior:</p>
                                                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                                      {field === 'content' 
                                                        ? JSON.stringify(oldSnapshot, null, 2)
                                                        : oldSnapshot[field]
                                                      }
                                                    </pre>
                                                  </div>
                                                  <div>
                                                    <p className="text-xs text-gray-500 mb-1">Novo:</p>
                                                    <pre className="text-xs bg-green-50 p-2 rounded overflow-auto max-h-32">
                                                      {field === 'content'
                                                        ? JSON.stringify(newSnapshot, null, 2)
                                                        : newSnapshot[field]
                                                      }
                                                    </pre>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}