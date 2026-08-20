import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("flex min-h-20 w-full resize-none rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus-visible:ring-0", className)} {...props} />
));
Textarea.displayName = "Textarea";
