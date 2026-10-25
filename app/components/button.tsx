import { Button as BaseButton } from "@base-ui/react/button";
import React from "react";

import cn from "~/utils/cn";

export interface ButtonProps extends React.ComponentProps<typeof BaseButton> {
  variant?: "heavy" | "light" | "danger" | "ghost";
}

export default function Button({ variant = "light", className, ...props }: ButtonProps) {
  return (
    <BaseButton
      {...props}
      className={cn(
        "inline-flex w-fit items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm",
        "transition-colors duration-100 active:scale-[0.98]",
        "focus:outline-hidden focus:ring-2 focus:ring-accent/40 focus:ring-offset-1",
        "dark:focus:ring-accent/40 dark:focus:ring-offset-canvas",
        props.disabled && "pointer-events-none opacity-50",
        ...(variant === "heavy"
          ? [
              "bg-accent font-semibold text-accent-fg",
              "hover:bg-accent/90",
              "dark:bg-accent/90 dark:hover:bg-accent/80",
            ]
          : variant === "danger"
            ? [
                "bg-danger font-semibold text-white",
                "hover:bg-danger/90",
                "dark:bg-danger dark:hover:bg-danger/90",
              ]
            : variant === "ghost"
              ? ["font-medium text-accent", "hover:bg-accent-subtle"]
              : [
                  "border border-line bg-surface font-medium",
                  "hover:bg-subtle",
                  "dark:border-line-strong dark:bg-raised/50",
                  "dark:hover:bg-hover",
                ]),
        className,
      )}
    />
  );
}
