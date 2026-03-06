import { useState, useMemo } from "react";
import { Building2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DepartmentMultiSelectProps = {
  departments: Array<{ id: string; name: string }>;
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function DepartmentMultiSelect({ 
  departments, 
  value, 
  onChange, 
  placeholder = "Selecione departamentos...",
  disabled = false,
}: DepartmentMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const toggleDepartment = (deptId: string) => {
    if (value.includes(deptId)) {
      onChange(value.filter(id => id !== deptId));
    } else {
      onChange([...value, deptId]);
    }
  };

  const selectedDepartments = departments.filter(dept => value.includes(dept.id));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter(d => d.name.toLowerCase().includes(term));
  }, [departments, q]);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="w-full text-left" disabled={disabled}>
            <div className="flex flex-wrap gap-2 min-h-[40px] items-center border rounded-md px-3 py-2 bg-background hover:shadow-sm transition">
              {selectedDepartments.length === 0 ? (
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              ) : (
                selectedDepartments.map(dept => (
                  <Badge
                    key={dept.id}
                    variant="secondary"
                    className="inline-flex items-center gap-1 pr-1 group rounded-full"
                  >
                    <Building2 className="h-3 w-3" />
                    <span className="max-w-[12rem] truncate">{dept.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleDepartment(dept.id); }}
                      disabled={disabled}
                      className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded-full p-0.5 transition-all"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[18rem] p-2">
          <div className="px-2 pb-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar departamentos..."
              className="mb-2"
            />
          </div>

          <div className="max-h-60 overflow-auto px-1 space-y-1">
            {filtered.map(dept => {
              const active = value.includes(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggleDepartment(dept.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent/5 ${active ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate">{dept.name}</div>
                    </div>
                  </div>

                  <div className="ml-auto">
                    {active ? <Check className="h-4 w-4 text-[color:var(--sinaxys-primary)]" /> : null}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nenhum departamento encontrado.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}