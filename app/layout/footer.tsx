import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import Link from "~/components/link";
import cn from "~/utils/cn";

export interface FooterProps {
  isDebug: boolean;
  baseUrl: string;
}

export default function Footer({ isDebug, baseUrl }: FooterProps) {
  const [urlVisible, setUrlVisible] = useState(false);

  return (
    <footer
      className={cn(
        "fixed w-full bottom-0 left-0 z-20",
        "bg-canvas/90",
        "backdrop-blur-md",
        "border-t border-line",
      )}
    >
      <div className="container flex flex-wrap items-center justify-between gap-2 py-2">
        <p className="text-muted text-xs">
          Headplane is free and open-source. Please consider{" "}
          <Link external styled to="https://tale.me/sponsor">
            sponsoring
          </Link>{" "}
          to support development.
        </p>
        <div className="flex items-center gap-2 text-xs">
          {isDebug && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-medium leading-none",
                "bg-warn-subtle text-warn",
              )}
            >
              Debug
            </span>
          )}
          <p className="text-muted">
            {__VERSION__}
            <span className="mx-1.5 opacity-40">&middot;</span>
            {urlVisible ? (
              <code className="bg-subtle rounded px-1 py-0.5 font-mono text-xs">{baseUrl}</code>
            ) : (
              <span aria-hidden="true">&bull;&bull;&bull;&bull;&bull;</span>
            )}
            <button
              type="button"
              aria-label={urlVisible ? "Hide server URL" : "Show server URL"}
              className={cn(
                "ml-1 inline-flex align-middle rounded p-0.5 smooth-transition",
                "text-muted hover:text-fg",
                "focus:outline-hidden focus:ring-2 focus:ring-accent/40",
              )}
              onClick={() => setUrlVisible((v) => !v)}
            >
              {urlVisible ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </p>
        </div>
      </div>
    </footer>
  );
}
