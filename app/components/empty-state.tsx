import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import cn from "~/utils/cn";

import Button, { type ButtonProps } from "./button";

export interface EmptyStateProps {
  /**
   * The icon to display. Defaults to Inbox.
   */
  icon?: ReactNode;
  /**
   * The main title of the empty state.
   */
  title: string;
  /**
   * A description explaining why the state is empty and what the user can do.
   */
  description: string;
  /**
   * Optional primary action (e.g., "Create your first machine").
   */
  action?: {
    label: string;
    onClick?: () => void;
  } & Partial<ButtonProps>;
  /**
   * Optional secondary action (e.g., "Learn more").
   */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  } & Partial<ButtonProps>;
  /**
   * Visual variant of the empty state.
   */
  variant?: "default" | "filtered" | "error";
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const Icon = icon ?? (variant === "error" ? <AlertCircle /> : <Inbox />);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-16 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex h-14 w-14 items-center justify-center rounded-2xl",
          "border border-line bg-subtle",
          "shadow-sm",
          variant === "error" ? "bg-bad-subtle text-bad border-bad/20" : "bg-subtle text-muted",
        )}
        aria-hidden="true"
      >
        <span className="[&>svg]:size-6">{Icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-balance">{title}</h3>
      <p className="text-muted mt-2 max-w-md text-sm text-balance">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button variant={action.variant ?? "heavy"} onClick={action.onClick} {...action}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant ?? "light"}
              onClick={secondaryAction.onClick}
              {...secondaryAction}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
