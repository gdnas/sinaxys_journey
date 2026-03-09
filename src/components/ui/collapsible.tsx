import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

// Add data-state attribute mapping to make styling transitions easier when opening/closing.
// Radix Collapsible already adds data-state but this file centralizes exports for clarity.

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
