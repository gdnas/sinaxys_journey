import { Badge } from "@/components/ui/badge";
import { Target, Layers } from "lucide-react";

type TierBadgeProps = {
  tier: "TIER1" | "TIER2";
  size?: "sm" | "md" | "lg";
};

export function TierBadge({ tier, size = "sm" }: TierBadgeProps) {
  const isTier1 = tier === "TIER1";
  
  const variant = isTier1 
    ? "default" 
    : "secondary";
  
  const icon = isTier1 ? <Target className={`h-3 w-3 ${size === "sm" ? "" : "h-4 w-4"}`} /> 
                : <Layers className={`h-3 w-3 ${size === "sm" ? "" : "h-4 w-4"}`} />;
  
  const label = isTier1 ? "Estratégico" : "Tático";
  
  return (
    <Badge 
      variant={variant}
      className={`
        ${size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}
        ${isTier1 
          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100" 
          : "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100"
        }
        transition-colors duration-200
      `}
    >
      <span className="inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  );
}
