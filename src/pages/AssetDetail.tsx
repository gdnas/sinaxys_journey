import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Box, DollarSign, FileText, History, AlertTriangle, MoreHorizontal } from "lucide-react";
import { getAssetWithDetails, calculateDepreciationSummary, getAssetStatusLabel, getAssetCategoryLabel } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AssetDetail() {
  const { assetId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [asset, setAsset] = useState<any>(null);
  const [depreciation, setDepreciation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === "MASTERADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    async function loadAsset() {
      if (!assetId) return;

      setLoading(true);
      try {
        const data = await getAssetWithDetails(assetId);
        setAsset(data);
        
        if (data) {
          const depSummary = calculateDepreciationSummary(data);
          setDepreciation(depSummary);
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar ativo",
          description: error instanceof Error ? error.message : "Não foi possível carregar o ativo.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadAsset();
  }, [assetId, toast]);

  if (loading) return <div className="p-6">Carregando...</div>;
  if (!asset) return <div className="p-6">Ativo não encontrado.</div>;

  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <Link to="/app/ativos">
                <Button variant="ghost" className="rounded-2xl" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
                    {asset.asset_code}
                  </h1>
                  <Badge variant="outline" className="rounded-2xl">
                    {getAssetStatusLabel(asset.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{asset.asset_type}</p>
                <p className="text-xs text-muted-foreground">
                  {asset.brand} {asset.model} {asset.serial_number && `• S/N: ${asset.serial_number}`}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-2xl">
                    <MoreHorizontal className="mr-2 h-4 w-4" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canManage && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to={`/app/ativos/${asset.id}/editar`}>Editar</Link>
                      </DropdownMenuItem>
                      {asset.status === "in_stock" && (
                        <DropdownMenuItem asChild>
                          <Link to={`/app/ativos/${asset.id}/entregar`}>Entregar ativo</Link>
                        </DropdownMenuItem>
                      )}
                      {asset.status === "in_use" && (
                        <DropdownMenuItem asChild>
                          <Link to={`/app/ativos/${asset.id}/devolver`}>Registrar devolução</Link>
                        </DropdownMenuItem>
                      )}
                      {asset.status === "in_use" && (
                        <DropdownMenuItem asChild>
                          <Link to={`/app/ativos/${asset.id}/ocorrencia`}>Registrar ocorrência</Link>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 rounded-2xl">
              <TabsTrigger value="details" className="rounded-xl">Dados Gerais</TabsTrigger>
              <TabsTrigger value="assignment" disabled={!asset.current_assignment}>Cessão Atual</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciação</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>

            {/* Dados Gerais */}
            <TabsContent value="details" className="space-y-6">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Box className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Identificação</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <DetailItem label="Código" value={asset.asset_code} />
                  <DetailItem label="Categoria" value={getAssetCategoryLabel(asset.category)} />
                  <DetailItem label="Tipo" value={asset.asset_type} />
                  <DetailItem label="Marca" value={asset.brand || "-"} />
                  <DetailItem label="Modelo" value={asset.model || "-"} />
                  <DetailItem label="Número de série" value={asset.serial_number || "-"} />
                  <DetailItem label="Status" value={getAssetStatusLabel(asset.status)} />
                  <DetailItem label="Localização" value={asset.current_location || "-"} />
                  <DetailItem label="Estado inicial" value={asset.condition_initial} />
                </div>
              </Card>

              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Dados Financeiros</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <DetailItem
                    label="Valor de aquisição"
                    value={asset.purchase_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  />
                  <DetailItem
                    label="Data de aquisição"
                    value={format(new Date(asset.purchase_date), "dd/MM/yyyy")}
                  />
                  <DetailItem label="Fornecedor" value={asset.supplier || "-"} />
                  <DetailItem label="Vida útil" value={`${asset.useful_life_months} meses`} />
                  <DetailItem label="Método de depreciação" value={asset.depreciation_method} />
                  <DetailItem
                    label="Valor residual atual"
                    value={asset.residual_value_current.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  />
                </div>
              </Card>

              {asset.notes && (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <h2 className="mb-2 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Observações</h2>
                  <p className="text-sm text-muted-foreground">{asset.notes}</p>
                </Card>
              )}
            </TabsContent>

            {/* Cessão Atual */}
            <TabsContent value="assignment">
              {asset.current_assignment ? (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Box className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                    <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Cessão Atual</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <DetailItem label="Colaborador" value={asset.current_assignment.profile?.name || "-"} />
                    <DetailItem label="Empresa PJ" value={asset.current_assignment.contractor_company?.legal_name || "-"} />
                    <DetailItem label="Modalidade" value={asset.current_assignment.modality} />
                    <DetailItem
                      label="Data de entrega"
                      value={format(new Date(asset.current_assignment.assigned_at), "dd/MM/yyyy")}
                    />
                    <DetailItem label="Valor mensal" value={asset.current_assignment.monthly_amount ? asset.current_assignment.monthly_value : "-"} />
                    <DetailItem label="Documento" value={asset.current_assignment.signed_document_url ? "Anexado" : "Pendente"} />
                  </div>
                </Card>
              ) : (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/20 p-6">
                  <p className="text-center text-sm text-muted-foreground">
                    Este ativo não está vinculado a nenhuma cessão ativa.
                  </p>
                </Card>
              )}
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="history">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Histórico de Eventos</h2>
                </div>
                {asset.events && asset.events.length > 0 ? (
                  <div className="space-y-4">
                    {asset.events.map((event: any) => (
                      <div key={event.id} className="flex gap-4 border-b border-[color:var(--sinaxys-border)] pb-4 last:border-0">
                        <div className="flex-shrink-0 text-sm text-muted-foreground">
                          {format(new Date(event.event_date), "dd/MM/yyyy HH:mm")}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[color:var(--sinaxys-ink)]">{event.title || event.event_type}</div>
                          {event.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                )}
              </Card>
            </TabsContent>

            {/* Depreciação */}
            <TabsContent value="depreciation">
              {depreciation && (
                <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                    <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Depreciação</h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <DetailItem
                      label="Valor de aquisição"
                      value={depreciation.purchase_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    />
                    <DetailItem label="Vida útil" value={`${depreciation.useful_life_months} meses`} />
                    <DetailItem
                      label="Depreciação mensal"
                      value={depreciation.monthly_depreciation.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    />
                    <DetailItem label="Meses decorridos" value={depreciation.months_elapsed} />
                    <DetailItem
                      label="Depreciação acumulada"
                      value={depreciation.accumulated_depreciation.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    />
                    <DetailItem
                      label="Valor residual"
                      value={depreciation.residual_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    />
                  </div>
                  <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)]/20 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Depreciação</span>
                      <span className="text-lg font-bold text-[color:var(--sinaxys-ink)]">
                        {depreciation.depreciation_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-[color:var(--sinaxys-primary)]"
                        style={{ width: `${depreciation.depreciation_percentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Documentos */}
            <TabsContent value="documents">
              <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
                  <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Documentos</h2>
                </div>
                {asset.documents && asset.documents.length > 0 ? (
                  <div className="space-y-3">
                    {asset.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                        <div>
                          <div className="font-medium text-[color:var(--sinaxys-ink)]">{doc.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{doc.document_type}</div>
                        </div>
                        <Badge variant="outline" className="rounded-2xl">
                          {format(new Date(doc.created_at), "dd/MM/yyyy")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RequireCompanyModule>
    </RequireAuth>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-[color:var(--sinaxys-ink)]">{value}</div>
    </div>
  );
}
