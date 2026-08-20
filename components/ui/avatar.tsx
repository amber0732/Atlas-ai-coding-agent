import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid place-items-center overflow-hidden rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600", className)} {...props}>{children}</div>;
}
