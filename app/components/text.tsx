import type React from "react";

import cn from "~/utils/cn";

export interface TextProps extends React.ComponentPropsWithoutRef<"p"> {
  children: React.ReactNode;
}

/**
 * Text component for descriptive paragraph text.
 * Renders as a paragraph with muted styling.
 */
export default function Text({ className, children, ...props }: TextProps) {
  return (
    <p className={cn("text-muted", className)} {...props}>
      {children}
    </p>
  );
}
