import { useState, useEffect, useMemo } from "react";
import { GripVertical, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DeliverableTask = {
  id: string;
  title: string;
  ownerName?: string | null;
  status?: string | null;
};

type Deliverable = {
  id: string;
  title: string;
  start_date: string | null;
  due_at: string | null;
  ownerName?: string;
  ownerAvatar?: string | null;
  tasks?: DeliverableTask[];
};

export default function DeliverableTimeline({
  deliverables,
  onBarClick,
  onReschedule,
  showHeader = true,
}: {
  deliverables: Deliverable[];
  onBarClick: (id: string) => void;
  onReschedule: (id: string, startIso: string | null, dueIso: string | null) => Promise<void>;
  showHeader?: boolean;
}) {
  const [viewMode, setViewMode] = useState<"list" | "gantt">("list");
  
  // Set initial viewMode based on screen width
  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    setViewMode(isDesktop ? "gantt" : "list");
  }, []);
  
  // Estado para drag & resize
  const [dragState, setDragState] = useState<{
    id: string | null;
    isDragging: boolean;
    isResizing: boolean;
    isResizingLeft: boolean;
    startX: number;
    originalStart: string | null;
    originalDue: string | null;
    newStart: string | null;
    newDue: string | null;
  }>({ id: null, isDragging: false, isResizing: false, isResizingLeft: false, startX: 0, originalStart: null, originalDue: null, newStart: null, newDue: null });

  // Calcular o intervalo de tempo
  const { minDate, maxDate, months, dayWidth, leftColWidth } = useMemo(() => {
    const dates = deliverables.flatMap(d => [d.start_date, d.due_at].filter(Boolean) as string[]);
    if (dates.length === 0) {
      const now = new Date();
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      return {
        minDate: new Date(now.getFullYear(), now.getMonth(), 1),
        maxDate: new Date(now.getFullYear(), now.getMonth() + 2, 0),
        months: [now],
        dayWidth: 30,
        leftColWidth: isDesktop ? "12rem" : "10rem",
      };
    }
    const min = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const max = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    // Adicionar margem de 2 semanas em cada lado
    min.setDate(min.getDate() - 14);
    max.setDate(max.getDate() + 14);
    
    const months: Date[] = [];
    let current = new Date(min.getFullYear(), min.getMonth(), 1);
    while (current <= max) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    // Calcular largura de cada dia para caber na tela (mínimo 30px)
    const totalDays = Math.max(30, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    const dayWidth = Math.max(30, Math.min(50, 1200 / totalDays));
    
    // Responsive left column width
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const leftColWidth = isDesktop ? "12rem" : "10rem";
    
    return { minDate: min, maxDate: max, months, dayWidth, leftColWidth };
  }, [deliverables]);

  // Formatar data
  const formatDate = (date: string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  };

  // Handlers de mouse/touch
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, deliverable: Deliverable, isResize = false, isResizeLeft = false) => {
    e.preventDefault();
    const startX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragState({
      id: deliverable.id,
      isDragging: !isResize,
      isResizing: isResize,
      isResizingLeft: isResizeLeft,
      startX,
      originalStart: deliverable.start_date,
      originalDue: deliverable.due_at,
      newStart: deliverable.start_date,
      newDue: deliverable.due_at,
    });
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!dragState.id || dragState.originalDue === null) return;
    const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (dragState.isDragging) {
      // Mover a barra inteira
      if (!dragState.originalDue) return;
      const dueDate = new Date(dragState.originalDue);
      dueDate.setDate(dueDate.getDate() + deltaDays);
      const newDue = dueDate.toISOString();
      
      let newStart = dragState.newStart;
      if (dragState.originalStart) {
        const startDate = new Date(dragState.originalStart);
        startDate.setDate(startDate.getDate() + deltaDays);
        newStart = startDate.toISOString();
      }
      
      setDragState(prev => ({ ...prev, newStart, newDue }));
    } else if (dragState.isResizing) {
      // Redimensionar
      const dueDate = new Date(dragState.originalDue);
      if (dragState.isResizingLeft) {
        // Ajustar data de início
        let newStart = dragState.originalStart;
        if (newStart) {
          const startDate = new Date(newStart);
          startDate.setDate(startDate.getDate() + deltaDays);
          newStart = startDate.toISOString();
          // Não deixar data de início passar a data de fim
          const start = new Date(newStart);
          const due = new Date(dragState.originalDue);
          if (start >= due) return;
        }
        setDragState(prev => ({ ...prev, newStart }));
      } else {
        // Ajustar data de fim
        dueDate.setDate(dueDate.getDate() + deltaDays);
        let newStart = dragState.newStart;
        // Não deixar data de fim passar a data de início
        if (newStart) {
          const start = new Date(newStart);
          const due = new Date(dueDate);
          if (due <= start) return;
        }
        setDragState(prev => ({ ...prev, newDue: dueDate.toISOString() }));
      }
    }
  };

  const handleMouseUp = async () => {
    if (!dragState.id) return;
    
    if (dragState.newStart !== dragState.originalStart || dragState.newDue !== dragState.originalDue) {
      await onReschedule(dragState.id, dragState.newStart, dragState.newDue);
    }
    
    setDragState({ id: null, isDragging: false, isResizing: false, isResizingLeft: false, startX: 0, originalStart: null, originalDue: null, newStart: null, newDue: null });
  };

  // Adicionar e remover event listeners
  useMemo(() => {
    if (dragState.isDragging || dragState.isResizing) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleMouseMove(e);
      const handleUp = () => handleMouseUp();
      window.addEventListener("mousemove", handleMove as any);
      window.addEventListener("touchmove", handleMove as any, { passive: false } as any);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchend", handleUp);
      return () => {
        window.removeEventListener("mousemove", handleMove as any);
        window.removeEventListener("touchmove", handleMove as any);
        window.removeEventListener("mouseup", handleUp);
        window.removeEventListener("touchend", handleUp);
      };
    }
    return () => {};
  }, [dragState, dayWidth, onReschedule]);

  // Renderizar visualização em lista
  const renderListView = () => {
    if (deliverables.length === 0) {
      return (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum entregável com datas definidas</div>
        </div>
      );
    }

    const sorted = [...deliverables].sort((a, b) => {
      const dateA = a.due_at ? new Date(a.due_at).getTime() : Infinity;
      const dateB = b.due_at ? new Date(b.due_at).getTime() : Infinity;
      return dateA - dateB;
    });

    return (
      <div className="space-y-2">
        {sorted.map((d) => {
          const isDragging = dragState.id === d.id;
          const initials = d.ownerName ? d.ownerName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() : "—";
          
          return (
            <div
              key={d.id}
              className={`group flex items-start gap-3 rounded-2xl border bg-white p-4 transition cursor-pointer hover:border-[color:var(--sinaxys-primary)] ${
                isDragging ? "ring-2 ring-[color:var(--sinaxys-primary)]" : ""
              }`}
              style={{ borderColor: isDragging ? "var(--sinaxys-primary)" : "var(--sinaxys-border)" }}
              onClick={() => !isDragging && onBarClick(d.id)}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                {d.ownerAvatar ? (
                  <AvatarImage src={d.ownerAvatar} alt={d.ownerName} />
                ) : null}
                <AvatarFallback aria-label={d.ownerName || "Sem responsável"}>{initials}</AvatarFallback>
              </Avatar>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]" title={d.title}>{d.title}</div>
                  <div className="text-xs text-muted-foreground" title={d.due_at ? formatDate(d.due_at) : "Sem prazo"}>{d.due_at ? formatDate(d.due_at) : "Sem prazo"}</div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" title={d.ownerName || "Sem responsável"}>
                    <UserIcon className="h-3 w-3" />
                    {d.ownerName || "Sem responsável"}
                  </span>
                  {d.start_date ? <span title={`Início: ${formatDate(d.start_date)}`}>Início: {formatDate(d.start_date)}</span> : null}
                  {d.due_at ? <span title={`Prazo: ${formatDate(d.due_at)}`}>Prazo: {formatDate(d.due_at)}</span> : null}
                </div>

                {d.tasks && d.tasks.length ? (
                  <div className="mt-3 space-y-2">
                    {d.tasks.map(t => (
                      <div key={t.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-3 text-sm flex items-center justify-between">
                        <div className="min-w-0 truncate" title={t.title}>{t.title}</div>
                        <div className="text-xs text-muted-foreground" title={t.ownerName ?? "—"}>{t.ownerName ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              
              <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>
    );
  };

  // Renderizar visualização Gantt
  const renderGanttView = () => {
    if (deliverables.length === 0) {
      return (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/30 p-8 text-center">
          <div className="text-sm text-muted-foreground">Nenhum entregável com datas definidas</div>
        </div>
      );
    }

    const today = new Date();
    const todayOffset = (today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) * dayWidth;

    return (
      <div className="overflow-x-auto">
        <div className="relative min-w-max">
          {/* Cabeçalho com meses */}
          <div className="flex border-b border-[color:var(--sinaxys-border)]">
            <div className="flex-shrink-0 p-2 text-xs font-semibold text-muted-foreground sticky left-0 bg-[color:var(--sinaxys-bg)] z-10" style={{ width: leftColWidth }}>
              Entregável
            </div>
            <div className="flex">
              {months.map((month, idx) => {
                const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
                const width = daysInMonth * dayWidth;
                return (
                  <div key={idx} className="text-center border-l border-[color:var(--sinaxys-border)] p-2" style={{ width }}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">{formatDateShort(month)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linha do dia atual */}
          <div className="relative h-10 border-b border-[color:var(--sinaxys-border)]">
            <div className="absolute top-0 bottom-0 w-px bg-red-500 z-5" style={{ left: `calc(${leftColWidth} + ${todayOffset}px)` }}>
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
          </div>

          {/* Barras de entregáveis */}
          <div className="divide-y divide-[color:var(--sinaxys-border)]">
            {deliverables.map((d, idx) => {
              const isDragging = dragState.id === d.id;
              const initials = d.ownerName ? d.ownerName.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() : "—";
              
              // Calcular posição e largura
              const startDate = d.start_date ? new Date(d.start_date) : null;
              const dueDate = d.due_at ? new Date(d.due_at) : null;
              let barLeft = 0;
              let barWidth = 0;
              
              if (dueDate) {
                const startDays = startDate
                  ? (startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
                  : 0;
                const dueDays = (dueDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
                barLeft = startDays * dayWidth;
                barWidth = Math.max(30, (dueDays - startDays) * dayWidth);
              }
              
              // Usar datas atualizadas durante o arrasto
              const displayStart = isDragging && dragState.newStart ? new Date(dragState.newStart) : startDate;
              const displayDue = isDragging && dragState.newDue ? new Date(dragState.newDue) : dueDate;
              
              let displayBarLeft = barLeft;
              let displayBarWidth = barWidth;
              
              if (displayDue) {
                const startDays = displayStart
                  ? (displayStart.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
                  : 0;
                const dueDays = (displayDue.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
                displayBarLeft = startDays * dayWidth;
                displayBarWidth = Math.max(30, (dueDays - startDays) * dayWidth);
              }

              return (
                <div key={d.id} className="relative flex items-center h-14 hover:bg-[color:var(--sinaxys-tint)]/20 transition">
                  {/* Nome do entregável */}
                  <div className="flex-shrink-0 p-3 sticky left-0 bg-white z-10 border-r border-[color:var(--sinaxys-border)]" style={{ width: leftColWidth }}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        {d.ownerAvatar ? (
                          <AvatarImage src={d.ownerAvatar} alt={d.ownerName} />
                        ) : null}
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-[color:var(--sinaxys-ink)]" title={d.title}>{d.title}</div>
                        {d.ownerName ? (
                          <div className="truncate text-[10px] text-muted-foreground" title={d.ownerName}>{d.ownerName}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  
                  {/* Área da timeline */}
                  <div className="flex-1 relative h-full">
                    {dueDate ? (
                      <>
                        {/* Barra do entregável */}
                        <div
                          className={`absolute top-3 bottom-3 rounded-lg bg-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-primary)]/80 cursor-pointer flex items-center transition-colors ${
                            isDragging ? "ring-2 ring-[color:var(--sinaxys-primary)]/50 shadow-lg" : ""
                          }`}
                          style={{ left: displayBarLeft, width: displayBarWidth }}
                          onClick={(e) => { e.stopPropagation(); onBarClick(d.id); }}
                          onMouseDown={(e) => handleMouseDown(e as any, d, false, false)}
                          onTouchStart={(e) => handleMouseDown(e as any, d, false, false)}
                        >
                          <span className="truncate px-2 text-xs font-medium text-white" title={d.due_at ? formatDate(d.due_at) : "Sem data"}>{formatDate(d.due_at)}</span>
                        </div>
                        
                        {/* Handle de redimensionamento à esquerda */}
                        {displayStart ? (
                          <div
                            className={`absolute top-3 bottom-3 w-2 bg-transparent cursor-ew-resize hover:bg-[color:var(--sinaxys-primary)]/30 rounded-l-lg ${
                              isDragging && dragState.isResizingLeft ? "bg-[color:var(--sinaxys-primary)]/20" : ""
                            }`}
                            style={{ left: displayBarLeft, width: 8 }}
                            onMouseDown={(e) => handleMouseDown(e as any, d, true, true)}
                            onTouchStart={(e) => handleMouseDown(e as any, d, true, true)}
                          />
                        ) : null}
                        
                        {/* Handle de redimensionamento à direita */}
                        <div
                          className={`absolute top-3 bottom-3 w-2 bg-transparent cursor-ew-resize hover:bg-[color:var(--sinaxys-primary)]/30 rounded-r-lg ${
                            isDragging && dragState.isResizing && !dragState.isResizingLeft ? "bg-[color:var(--sinaxys-primary)]/20" : ""
                          }`}
                          style={{ left: displayBarLeft + displayBarWidth - 8, width: 8 }}
                          onMouseDown={(e) => handleMouseDown(e as any, d, true, false)}
                          onTouchStart={(e) => handleMouseDown(e as any, d, true, false)}
                        />
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground p-3">
                        Sem data definida
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="timeline-container">
      {showHeader && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline de Entregáveis</div>
          <Select value={viewMode} onValueChange={(v: "list" | "gantt") => setViewMode(v)} data-testid="timeline-select">
            <SelectTrigger className="h-9 w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Lista</SelectItem>
              <SelectItem value="gantt">Gantt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {!showHeader && (
        <div className="mb-3 flex items-center justify-end gap-3">
          <Select value={viewMode} onValueChange={(v: "list" | "gantt") => setViewMode(v)} data-testid="timeline-select">
            <SelectTrigger className="h-9 w-[140px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Lista</SelectItem>
              <SelectItem value="gantt">Gantt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {viewMode === "list" ? renderListView() : renderGanttView()}
      
      {viewMode === "gantt" && (
        <div className="mt-2 text-xs text-muted-foreground">
          Arraste as barras para reagendar. Use as bordas esquerda/direita para ajustar datas de início/término.
        </div>
      )}
    </div>
  );
}