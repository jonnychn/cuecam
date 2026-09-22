import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,opacity,background-color,color,box-shadow] duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary:
          "bg-fg text-bg shadow-[var(--shadow-border)] hover:bg-steel",
        secondary:
          "bg-surface text-fg shadow-[var(--shadow-border)] hover:bg-surface-2",
        ghost: "bg-transparent text-fg hover:bg-surface",
        outline:
          "bg-transparent text-fg shadow-[var(--shadow-border)] hover:bg-surface",
        rec: "bg-rec text-rec-fg hover:opacity-90",
        danger: "bg-rec/15 text-rec hover:bg-rec/20",
      },
      size: {
        md: "h-11 rounded-md px-4 text-sm",
        lg: "h-12 rounded-lg px-5 text-[0.9375rem]",
        xl: "h-14 rounded-xl px-6 text-base",
        icon: "size-11 rounded-md",
        pill: "h-10 rounded-full px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
