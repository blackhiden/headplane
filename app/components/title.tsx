import type React from "react";

import cn from "~/utils/cn";

export interface TitleProps extends React.ComponentPropsWithoutRef<"h3"> {
  children: React.ReactNode;
}

/**
 * Title component for section headings.
 * Renders as an h3 with appropriate styling.
 */
export default function Title({ className, children, ...props }: TitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </h3>
  );
}
