import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import React, { cloneElement, useEffect, useRef } from "react";
import { Form, type HTMLFormMethod } from "react-router";

import Button, { type ButtonProps } from "~/components/button";
import cn from "~/utils/cn";
import { useLiveData } from "~/utils/live-data";

export interface DialogProps {
  children:
    | [React.ReactElement<ButtonProps>, React.ReactElement<DialogPanelProps>]
    | React.ReactElement<DialogPanelProps>;
  isOpen?: boolean;
  open?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onOpenChangeComplete?: (isOpen: boolean) => void;
  trigger?: React.ReactElement;
}

function Dialog(props: DialogProps) {
  const { pause, resume } = useLiveData();
  const { isOpen, open, onOpenChange, onOpenChangeComplete, trigger } = props;
  const actualOpen = open ?? isOpen;

  useEffect(() => {
    if (actualOpen) {
      pause();
    } else {
      resume();
    }
  }, [actualOpen]);

  if (trigger) {
    return (
      <BaseAlertDialog.Root
        open={actualOpen}
        onOpenChange={(newOpen) => onOpenChange?.(newOpen)}
        onOpenChangeComplete={(newOpen) => onOpenChangeComplete?.(newOpen)}
      >
        <BaseAlertDialog.Trigger render={cloneElement(trigger)} />
        <DialogOverlay>
          {Array.isArray(props.children) ? props.children[1] : props.children}
        </DialogOverlay>
      </BaseAlertDialog.Root>
    );
  }

  if (Array.isArray(props.children)) {
    const [button, panel] = props.children;
    return (
      <BaseAlertDialog.Root
        open={actualOpen}
        onOpenChange={(newOpen) => onOpenChange?.(newOpen)}
        onOpenChangeComplete={(newOpen) => onOpenChangeComplete?.(newOpen)}
      >
        <BaseAlertDialog.Trigger render={cloneElement(button)} />
        <DialogOverlay>{panel}</DialogOverlay>
      </BaseAlertDialog.Root>
    );
  }

  return (
    <BaseAlertDialog.Root
      open={actualOpen}
      onOpenChange={(newOpen) => onOpenChange?.(newOpen)}
      onOpenChangeComplete={(newOpen) => onOpenChangeComplete?.(newOpen)}
    >
      <DialogOverlay>{props.children}</DialogOverlay>
    </BaseAlertDialog.Root>
  );
}

export interface DialogPanelProps {
  children: React.ReactNode;
  variant?: "normal" | "destructive" | "unactionable";
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  method?: HTMLFormMethod;
  isDisabled?: boolean;
}

function Panel(props: DialogPanelProps) {
  const { children, onSubmit, isDisabled, variant, method = "POST" } = props;
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Popup
      className={cn(
        "flex w-full max-w-lg flex-col rounded-xl p-4",
        "max-h-[90dvh]",
        "outline-hidden",
        "bg-white dark:bg-mist-900",
        "border border-mist-200 dark:border-mist-800",
        "shadow-overlay",
        "transition-all duration-150 ease-out",
        "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
      )}
    >
      <Form
        method={method ?? "POST"}
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          if (onSubmit) {
            onSubmit(event);
          }

          if (!event.defaultPrevented) {
            closeRef.current?.click();
          }
        }}
      >
        {/* px-1 -mx-1 gives focus rings on inputs/buttons room to render
            without being clipped by overflow-y-auto (which implicitly forces
            overflow-x: auto per CSS spec). */}
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
          {children}
        </div>
        <div className="mt-5 flex shrink-0 justify-end gap-3">
          {variant === "unactionable" ? (
            <AlertDialog.Close render={<Button>Close</Button>} />
          ) : (
            <>
              <AlertDialog.Close render={<Button>Cancel</Button>} />
              <AlertDialog.Close ref={closeRef} className="hidden" aria-hidden tabIndex={-1} />
              <Button
                disabled={isDisabled}
                type="submit"
                variant={variant === "destructive" ? "danger" : "heavy"}
              >
                Confirm
              </Button>
            </>
          )}
        </div>
      </Form>
    </AlertDialog.Popup>
  );
}

function DialogOverlay({ children }: { children: React.ReactNode }) {
  return (
    <BaseAlertDialog.Portal>
      <BaseAlertDialog.Backdrop
        className={cn(
          "fixed inset-0 z-20 h-screen w-screen",
          "bg-mist-900/30 dark:bg-mist-950/60",
          "transition-opacity duration-100",
        )}
      />
      <div
        className={cn(
          "fixed inset-0 z-20 h-screen w-screen",
          "flex items-center justify-center p-4",
        )}
      >
        {children}
      </div>
    </BaseAlertDialog.Portal>
  );
}

// Dialog Title component
export function DialogTitle({ children, ...props }: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <BaseAlertDialog.Title asChild>
      <h2 className={cn("text-lg font-semibold")} {...props}>
        {children}
      </h2>
    </BaseAlertDialog.Title>
  );
}

// Dialog Description component
export function DialogDescription({ children, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return (
    <BaseAlertDialog.Description asChild>
      <p className={cn("text-muted text-sm")} {...props}>
        {children}
      </p>
    </BaseAlertDialog.Description>
  );
}

// Dialog Actions container
export function DialogActions({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("mt-5 flex shrink-0 justify-end gap-3", className)} {...props}>
      {children}
    </div>
  );
}

// Dialog Close component
export const DialogClose = BaseAlertDialog.Close;

// Re-export AlertDialog for components that need it
export const AlertDialog = BaseAlertDialog;

export { Panel as DialogPanel };
export { Dialog };
export default Dialog;
