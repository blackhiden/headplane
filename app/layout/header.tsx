import {
  Check,
  CircleQuestionMark,
  CircleUser,
  Globe,
  History,
  Lock,
  Monitor,
  Moon,
  Network,
  Radio,
  RefreshCw,
  Route,
  Server,
  Settings,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink, unstable_useRoute as useRoute, useLocation, useSubmit } from "react-router";

import Link from "~/components/link";
import LogoMark from "~/components/logo-mark";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "~/components/menu";
import { useUpdateCheckContext } from "~/update-check";
import cn from "~/utils/cn";
import type { ColorScheme } from "~/utils/color-scheme";

export interface HeaderProps {
  user: {
    subject: string;
    name: string;
    email?: string;
    username?: string;
    picture?: string;
  };
  access: {
    ui: boolean;
    machines: boolean;
    dns: boolean;
    users: boolean;
    policy: boolean;
    settings: boolean;
    audit: boolean;
    admin: boolean;
  };
  configAvailable: boolean;
}

const tabs = [
  { to: "/machines", icon: Server, label: "Machines", key: "machines" },
  { to: "/users", icon: Users, label: "Users", key: "users" },
  { to: "/acls", icon: Lock, label: "Access Control", key: "policy" },
  { to: "/dns", icon: Globe, label: "DNS", key: "dns" },
  { to: "/routes", icon: Route, label: "Routes", key: "machines" },
  { to: "/topology", icon: Network, label: "Topology", key: "machines" },
  { to: "/derp", icon: Radio, label: "DERP", key: "audit" },
  { to: "/instances", icon: Server, label: "Instances", key: "settings" },
  { to: "/audit", icon: History, label: "Audit", key: "audit" },
  { to: "/admin", icon: ShieldAlert, label: "Admin", key: "admin" },
  { to: "/settings", icon: Settings, label: "Settings", key: "settings" },
] as const;

const colorSchemes = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const satisfies ReadonlyArray<{
  value: ColorScheme;
  label: string;
  icon: typeof Monitor;
}>;

export default function Header({ user, access, configAvailable }: HeaderProps) {
  const submit = useSubmit();
  const showTabs = access.ui;
  const rootRoute = useRoute("root");
  const currentColorScheme: ColorScheme = rootRoute?.loaderData?.colorScheme ?? "system";
  // useLocation returns the path with the basename already stripped, which is
  // what `redirect()` expects — react-router re-applies the basename when
  // following the redirect on the client.
  const location = useLocation();
  const returnTo = location.pathname + location.search;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full",
        "bg-canvas/80",
        "backdrop-blur-lg",
        "text-fg",
        "border-b border-line",
      )}
    >
      <div className="container flex items-center gap-x-4 py-3">
        <div className="flex min-w-0 items-center gap-x-4">
          <div className="flex items-center gap-x-2">
            <LogoMark />
            <h1 className="text-xl font-semibold tracking-tight">headplane</h1>
          </div>
          {showTabs && (
            <nav className="hidden items-center gap-x-1 overflow-x-auto text-sm font-medium md:flex">
              {tabs.map((tab) => {
                if (!access[tab.key]) return null;
                if ((tab.key === "dns" || tab.key === "settings") && !configAvailable) return null;

                return (
                  <NavLink
                    key={tab.to}
                    className={({ isActive }) =>
                      cn(
                        "px-3 py-1.5 flex items-center gap-x-1.5 rounded-md text-nowrap smooth-transition",
                        "hover:bg-subtle",
                        "focus:outline-hidden focus:ring-2 focus:ring-accent/40 focus:ring-offset-1",
                        "dark:focus:ring-accent/40 dark:focus:ring-offset-canvas",
                        isActive ? "bg-subtle text-fg shadow-sm" : "text-muted hover:text-fg",
                      )
                    }
                    prefetch="intent"
                    to={tab.to}
                  >
                    <tab.icon className="w-4" />
                    {tab.label}
                  </NavLink>
                );
              })}
            </nav>
          )}
        </div>
        <div className="ml-auto grid shrink-0 grid-cols-2 gap-x-4">
          <Menu>
            <MenuTrigger aria-label="Help links" className="size-8 rounded-full p-1">
              <CircleQuestionMark className="w-5" />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem>
                <Link external to="https://headplane.net">
                  Docs
                </Link>
              </MenuItem>
              <MenuItem>
                <Link external to="https://headscale.net">
                  Headscale
                </Link>
              </MenuItem>
              <MenuItem>
                <Link external to="https://tailscale.com/download">
                  Download
                </Link>
              </MenuItem>
            </MenuContent>
          </Menu>
          {/* 
            CRITICAL: User avatar in menu button - DO NOT REMOVE
            
            This UserAvatar component renders the configured user.avatar image
            in the user menu trigger button. This is a required feature per:
            - FR-1.5 in docs/SPECIFICATION.md (local admin avatar configuration)
            - docs/configuration/index.md (user.avatar field documentation)
            - CHANGELOG.md (v1.0.8: local admin avatar feature)
            
            The avatar displays when user.picture is set and loads successfully,
            with automatic fallback to the default CircleUser icon when unset
            or failed. This behavior is validated by component tests in
            tests/component/user-avatar.test.tsx.
            
            If this is removed during upstream merge, the user menu will lose
            the avatar display, breaking the documented functionality.
          */}
          <Menu>
            <MenuTrigger
              aria-label={`${user.name} menu`}
              className="size-8 overflow-hidden rounded-full"
            >
              <UserAvatar name={user.name} picture={user.picture} />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem disabled>
                <div className="text-fg">
                  {user.subject === "api_key" ? (
                    <>
                      <p className="font-semibold">API Key</p>
                      <p className="text-muted">{user.name}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{user.name}</p>
                      {user.email && <p className="text-muted">{user.email}</p>}
                    </>
                  )}
                </div>
              </MenuItem>
              <MenuSeparator />
              {colorSchemes.map(({ value, label, icon: Icon }) => (
                <MenuItem
                  key={value}
                  onClick={() =>
                    submit(
                      { colorScheme: value, returnTo },
                      { action: "/api/color-scheme", method: "POST" },
                    )
                  }
                >
                  <div className="flex items-center gap-x-2">
                    <Icon className="size-4" />
                    <span className="flex-1">{label}</span>
                    {currentColorScheme === value && <Check className="size-4" />}
                  </div>
                </MenuItem>
              ))}
              <MenuSeparator />
              <UpdateCheckMenuItem />
              <MenuSeparator />
              <MenuItem
                variant="danger"
                onClick={() => submit({}, { action: "/logout", method: "POST" })}
              >
                Logout
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
      {showTabs && (
        <div className="block overflow-x-auto p-2 md:hidden">
          <nav className="flex items-center gap-x-2 text-sm font-medium transition-opacity duration-100">
            {tabs.map((tab) => {
              if (!access[tab.key]) return null;
              if ((tab.key === "dns" || tab.key === "settings") && !configAvailable) return null;

              return (
                <NavLink
                  key={tab.to}
                  className={({ isActive }) =>
                    cn(
                      "relative px-2.5 py-1.5 flex items-center gap-x-1.5 rounded-md text-nowrap smooth-transition",
                      "hover:bg-subtle",
                      "focus:outline-hidden focus:ring-2 focus:ring-accent/40 focus:ring-offset-1",
                      "dark:focus:ring-accent/40 dark:focus:ring-offset-canvas",
                      "text-muted",
                      isActive && "text-fg bg-subtle shadow-sm",
                    )
                  }
                  prefetch="intent"
                  to={tab.to}
                >
                  <tab.icon className="w-4" />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * UserAvatar renders the user's configured avatar image with fallback.
 *
 * CRITICAL: DO NOT REMOVE - Required for FR-1.5 (docs/SPECIFICATION.md)
 *
 * This component displays the optional user.avatar image configured for local
 * administrators at /admin/admin/users (see docs/configuration/index.md).
 * When the image loads successfully, it displays as a circular avatar.
 * When unset or failed to load, it falls back to the default CircleUser icon.
 *
 * The avatar is rendered in the header's user menu button (line ~164 above).
 * Component behavior is validated by tests/component/user-avatar.test.tsx.
 *
 * @param name - User's display name for accessibility (alt text)
 * @param picture - Optional HTTPS URL or path to avatar image
 */
export function UserAvatar({ name, picture }: Pick<HeaderProps["user"], "name" | "picture">) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!picture || imageFailed) {
    return <CircleUser aria-hidden="true" className="size-8" />;
  }

  return (
    <span className="relative block size-8">
      <CircleUser aria-hidden="true" className="absolute inset-0 size-8" />
      <img
        alt={`${name}'s avatar`}
        className="absolute inset-0 z-10 size-8 rounded-full object-cover"
        onError={() => setImageFailed(true)}
        src={picture}
      />
    </span>
  );
}

/**
 * Menu item for checking updates, placed in the user menu.
 * Must be used within an <UpdateCheckProvider>.
 */
function UpdateCheckMenuItem() {
  const ctx = useUpdateCheckContext();
  const count = (ctx.headplaneUpdate !== null ? 1 : 0) + (ctx.headscaleUpdate !== null ? 1 : 0);

  return (
    <MenuItem onClick={() => ctx.checkNow("manual")} disabled={ctx.isChecking}>
      <div className="flex w-full items-center gap-2">
        <RefreshCw className={`size-4 ${ctx.isChecking ? "animate-spin" : ""}`} />
        <span className="flex-1">
          {ctx.isChecking ? "Checking for updates..." : "Check for Updates"}
        </span>
        {count > 0 && (
          <span className="bg-accent text-accent-fg inline-flex size-5 items-center justify-center rounded-full text-xs font-semibold">
            {count}
          </span>
        )}
      </div>
    </MenuItem>
  );
}
