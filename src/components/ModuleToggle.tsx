import { Switch } from "@/components/ui/switch";

function ModuleToggle({
  icon,
  title,
  description,
  checked,
  locked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className={
        "flex flex-col gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 sm:flex-row sm:items-center sm:justify-between " +
        (locked ? "opacity-90" : "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-[color:var(--sinaxys-border)]">{icon}</div>
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{description}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{checked ? "ativo" : "inativo"}</div>
        <Switch checked={checked} disabled={locked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export default ModuleToggle;
