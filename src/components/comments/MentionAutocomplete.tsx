import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface MentionAutocompleteProps {
  search: string;
  onSelect: (userId: string, name: string) => void;
  position: { top: number; left: number };
  companyId: string | null;
  onClose: () => void;
}

interface User {
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
        return;
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .eq("company_id", companyId)
          .eq("active", true)
          .or(`name.ilike.%${search}%,email.ilike.${search}%`)
          .limit(5);

        setUsers(data ?? []);
        setSelectedIndex(0);
      } catch (error) {
        console.error("[MentionAutocomplete] Error fetching users:", error);
        setUsers([]);
      }
    };

    fetchUsers();
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
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const selected = users[selectedIndex];
        if (selected) {
          onSelect(selected.id, selected.name);
        }
      } else if (event.key === "Escape") {
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
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-1">
        {users.map((user, index) => (
          <button
            key={user.id}
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              index === selectedIndex ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
            onClick={() => onSelect(user.id, user.name)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Avatar className="h-6 w-6">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} />
              ) : (
                <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            {index === selectedIndex && <Check className="h-4 w-4 text-gray-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}