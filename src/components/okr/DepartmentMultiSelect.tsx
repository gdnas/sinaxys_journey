import { useState } from "react";
import { Building2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const [isOpen, setIsOpen] = useState(false);

  const toggleDepartment = (deptId: string) => {
    if (value.includes(deptId)) {
      onChange(value.filter(id => id !== deptId));
    } else {
      onChange([...value, deptId]);
    }
  };

  const selectedDepartments = departments.filter(dept => value.includes(dept.id));

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 min-h-[40px] items-center border rounded-md px-3 py-2 bg-background">
        {selectedDepartments.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            {placeholder}
          </span>
        ) : (
          selectedDepartments.map(dept => (
            <Badge
              key={dept.id}
              variant="secondary"
              className="inline-flex items-center gap-1 pr-1 group"
            >
              <Building2 className="h-3 w-3" />
              {dept.name}
              <button
                type="button"
                onClick={() => toggleDepartment(dept.id)}
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
        {departments
          .filter(dept => !value.includes(dept.id))
          .map(dept => (
            <Button
              key={dept.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleDepartment(dept.id)}
              disabled={disabled}
              className="h-8 text-xs"
            >
              <Building2 className="h-3 w-3 mr-1" />
              {dept.name}
            </Button>
          ))
        }
      </div>
    </div>
  );
}
