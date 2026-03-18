import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface MentionAutocompleteProps {
  search: string;
  onSelect: (user: User) => void;
  position: { top: number; left: number };
  companyId: string | null;
  onClose: () => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export function MentionAutocomplete({
  search,
  onSelect,
  position,
  companyId,
  onClose,
}: MentionAutocompleteProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!search || !companyId) {
        setUsers([]);
        setSelectedIndex(0);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .eq("company_id", companyId)
          .eq("active", true)
          .or(`name.ilike.%${search}%,email.ilike.%${search}%`)
          .order("name", { ascending: true })
          .limit(5);

        if (error) throw error;

        setUsers((data ?? []) as User[]);
        setSelectedIndex(0);
      } catch (error) {
        console.error("[MentionAutocomplete] Error fetching users:", error);
        setUsers([]);
        setSelectedIndex(0);
      }
    };

    void fetchUsers();
  }, [search, companyId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (users.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = users[selectedIndex];
        if (selected) onSelect(selected);
        return;
      }

      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="space-y-1">
        {users.map((user, index) => {
          const isSelected = index === selectedIndex;

          return (
            <button
              key={user.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                isSelected
                  ? "bg-violet-500/20 text-white ring-1 ring-violet-400/40"
                  : "text-slate-100 hover:bg-white/5"
              }`}
              onClick={() => onSelect(user)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-9 w-9 border border-white/10">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-violet-500/20 text-[11px] font-semibold text-violet-100">
                    {getInitials(user.name)}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-inherit">{user.name}</div>
                <div className={`truncate text-xs ${isSelected ? "text-violet-100/80" : "text-slate-400"}`}>
                  {user.email}
                </div>
              </div>

              {isSelected ? <Check className="h-4 w-4 shrink-0 text-violet-200" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
