import { useState } from "react";
import { User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DbProfilePublic } from "@/lib/profilePublicDb";

type UserMultiSelectProps = {
  users: DbProfilePublic[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function UserMultiSelect({ 
  users, 
  value, 
  onChange, 
  placeholder = "Selecione responsáveis...",
  disabled = false,
}: UserMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleUser = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const selectedUsers = users.filter(user => value.includes(user.id));

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 min-h-[40px] items-center border rounded-md px-3 py-2 bg-background">
        {selectedUsers.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {placeholder}
          </span>
        ) : (
          selectedUsers.map(user => (
            <Badge
              key={user.id}
              variant="secondary"
              className="inline-flex items-center gap-1 pr-1 group"
            >
              <User className="h-3 w-3" />
              {user.name}
              <button
                type="button"
                onClick={() => toggleUser(user.id)}
                disabled={disabled}
                className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded-full p-0.5 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
      
      <div className="mt-2 flex flex-wrap gap-2">
        {users
          .filter(user => !value.includes(user.id))
          .slice(0, 10) // Limite para evitar poluição visual
          .map(user => (
            <Button
              key={user.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleUser(user.id)}
              disabled={disabled}
              className="h-8 text-xs"
            >
              <User className="h-3 w-3 mr-1" />
              {user.name}
            </Button>
          ))
        }
        {users.filter(user => !value.includes(user.id)).length > 10 && (
          <span className="text-xs text-muted-foreground self-center">
            +{users.filter(user => !value.includes(user.id)).length - 10} mais...
          </span>
        )}
      </div>
    </div>
  );
}
