import { Toast } from "@base-ui/react/toast";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import cn from "~/utils/cn";
import { toastManager } from "~/utils/toast";

const typeIcons = {
  info: Info,
  success: CheckCircle2,
  error: TriangleAlert,
} as const;

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const type = (toast as { type?: keyof typeof typeIcons }).type ?? "info";
    const Icon = typeIcons[type];
    const iconClass =
      type === "success" ? "text-ok" : type === "error" ? "text-bad" : "text-accent";

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn("toast-root rounded-lg", "bg-raised text-fg border-overlay shadow-overlay")}
      >
        <Toast.Content
          className={cn(
            "toast-content",
            "flex items-center justify-between gap-x-3 pl-4 pr-3 py-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden="true" />
            <Toast.Description className="min-w-0 text-sm">{toast.description}</Toast.Description>
          </div>
          <Toast.Close
            aria-label="Close"
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full p-1",
              "bg-transparent hover:bg-hover",
            )}
          >
            <X className="h-4 w-4" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}

export default function ToastProvider() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
