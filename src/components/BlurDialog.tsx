import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const BlurDialog = DialogPrimitive.Root;
export const BlurDialogTrigger = DialogPrimitive.Trigger;

export const BlurDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-[rgba(10,10,20,0.35)] backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[92vw] max-w-[560px] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[90vh] overflow-auto",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-2xl bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)]/70 ring-1 ring-[color:var(--sinaxys-border)] transition hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--sinaxys-primary)]">
        <X className="h-4 w-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
BlurDialogContent.displayName = "BlurDialogContent";

export function BlurDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1", className)} {...props} />;
}

export function BlurDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold tracking-tight text-[color:var(--sinaxys-ink)]", className)} {...props} />;
}

export function BlurDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function BlurDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}