import type React from "react";

import cn from "~/utils/cn";

function Card(props: React.HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "w-full max-w-md rounded-lg p-5",
        "bg-surface",
        "border border-line",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

function Title({ className, children, ...props }: React.HTMLProps<HTMLHeadingElement>) {
  return (
    <h2 {...props} className={cn("text-lg font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

function Text({ className, children, ...props }: React.HTMLProps<HTMLParagraphElement>) {
  return (
    <p {...props} className={cn("text-muted text-sm", className)}>
      {children}
    </p>
  );
}

Card.Title = Title;
Card.Text = Text;

export default Card;
