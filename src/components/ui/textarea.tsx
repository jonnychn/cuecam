import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      suppressHydrationWarning
      className={cn(
        "w-full resize-none bg-transparent text-fg placeholder:text-faint",
        "focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}
