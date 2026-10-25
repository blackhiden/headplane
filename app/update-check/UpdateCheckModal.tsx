import { ExternalLink, RefreshCw } from "lucide-react";

import Button from "~/components/button";
import Dialog, { DialogPanel } from "~/components/dialog";
import Link from "~/components/link";

import type { UpdateCheckResult } from "./types";
import {
  dismissForSession,
  hasUpdates,
  isDismissedForSession,
  isRemindLaterActive,
  remindLater,
  useUpdateCheckContext,
} from "./UpdateCheckProvider";

export default function UpdateCheckModal() {
  const ctx = useUpdateCheckContext();

  const isOpen =
    !ctx.isChecking &&
    hasUpdates(ctx) &&
    ctx.lastTrigger === "auto" &&
    !isDismissedForSession() &&
    !isRemindLaterActive();

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) ctx.clearResults();
      }}
    >
      <DialogPanel variant="unactionable">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Updates Available</h2>
          <p className="text-muted text-sm">
            New commits are available for the following projects:
          </p>

          <div className="flex flex-col gap-3">
            {ctx.headplaneUpdate && <UpdateCard result={ctx.headplaneUpdate} />}
            {ctx.headscaleUpdate && <UpdateCard result={ctx.headscaleUpdate} />}
          </div>

          <p className="text-faint text-xs">
            Checked automatically on page load. You can also check manually from the user menu at
            any time.
          </p>

          <div className="flex gap-2 pt-1">
            <Button
              variant="light"
              onClick={() => {
                dismissForSession();
                ctx.clearResults();
              }}
            >
              Dismiss for this session
            </Button>
            <Button
              variant="light"
              onClick={() => {
                remindLater();
                ctx.clearResults();
              }}
            >
              Remind me later
            </Button>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
}

function UpdateCard({ result }: { result: UpdateCheckResult }) {
  return (
    <div className="border-line bg-subtle rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{result.projectName}</h3>
        <span className="text-muted text-xs">
          {result.currentCommit} →{" "}
          <span className="text-accent font-mono">{result.remoteCommit}</span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Link
          external
          styled
          to={`${result.repoUrl.replace(/\.git$/, "")}/compare/${result.currentCommit}...${result.remoteCommit}`}
        >
          <span className="flex items-center gap-1">
            <ExternalLink className="size-3" />
            View changes
          </span>
        </Link>
        <span className="text-faint text-xs">·</span>
        {result.releaseUrl ? (
          <Link external styled to={result.releaseUrl}>
            <span className="flex items-center gap-1">
              <ExternalLink className="size-3" />
              Release Notes
            </span>
          </Link>
        ) : (
          <Link external styled to={`${result.repoUrl.replace(/\.git$/, "")}/releases`}>
            <span className="flex items-center gap-1">
              <ExternalLink className="size-3" />
              Releases
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * A small pill button that shows the update status and can be
 * placed in the header or settings page.
 */
export function UpdateCheckPill() {
  const ctx = useUpdateCheckContext();
  const count = (ctx.headplaneUpdate !== null ? 1 : 0) + (ctx.headscaleUpdate !== null ? 1 : 0);

  return (
    <button
      type="button"
      onClick={() => ctx.checkNow("manual")}
      disabled={ctx.isChecking}
      className="hover:bg-subtle focus:ring-accent/40 inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-hidden"
    >
      <RefreshCw className={`size-4 ${ctx.isChecking ? "animate-spin" : ""}`} />
      <span className="flex-1 text-left">
        {ctx.isChecking ? "Checking for updates..." : "Check for Updates"}
      </span>
      {count > 0 && (
        <span className="bg-accent text-accent-fg inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold">
          {count}
        </span>
      )}
    </button>
  );
}
