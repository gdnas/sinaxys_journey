import { useState, useMemo } from "react";
import { User, Check, X, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import type { DbProfilePublic } from "@/lib/profilePublicDb";

type UserMultiSelectProps = {
  users: DbProfilePublic[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  // optional: how many badges to show before collapsing into +N
  visibleBadgeCount?: number;
};

export function UserMultiSelect({ 
  users, 
  value, 
  onChange, 
  placeholder = "Selecione responsáveis...",
  disabled = false,
  visibleBadgeCount = 3,
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const selectedUsers = users.filter(user => value.includes(user.id));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => (u.name || "").toLowerCase().includes(term));
  }, [users, q]);

  const visibleSelected = selectedUsers.slice(0, visibleBadgeCount);
  const hiddenCount = Math.max(0, selectedUsers.length - visibleBadgeCount);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full text-left"
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-2 min-h-[40px] items-center border rounded-md px-3 py-2 bg-background hover:shadow-sm transition">
              {selectedUsers.length === 0 ? (
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleSelected.map(user => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="inline-flex items-center gap-1 pr-1 group rounded-full"
                    >
                      <User className="h-3 w-3" />
                      <span className="max-w-[10rem] truncate">{user.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleUser(user.id); }}
                        disabled={disabled}
                        className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded-full p-0.5 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {hiddenCount > 0 && (
                    <Badge variant="secondary" className="inline-flex items-center gap-1 pr-1 rounded-full">
                      +{hiddenCount}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[24rem] p-2">
          <div className="px-2 pb-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar responsáveis..."
              className="mb-2"
            />
          </div>

          <div className="max-h-60 overflow-auto px-1 space-y-1">
            {filtered.map(user => {
              const active = value.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-left hover:bg-accent/5 ${active ? "bg-accent/5" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate">{user.name}</div>
                      {user.job_title && <div className="text-xs text-muted-foreground truncate">{user.job_title}</div>}
                    </div>
                  </div>

                  <div className="ml-auto">
                    {active ? <Check className="h-4 w-4 text-[color:var(--sinaxys-primary)]" /> : null}
                  </div>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nenhum responsável encontrado.</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}