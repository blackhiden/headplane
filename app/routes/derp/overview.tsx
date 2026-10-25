import { Globe, Server } from "lucide-react";

import Chip from "~/components/chip";
import CompatibilityNotice from "~/components/compatibility-notice";
import EmptyState from "~/components/empty-state";
import PageError from "~/components/page-error";
import { authContext, headscaleContext, requestApiContext } from "~/server/context";
import { unsupportedFor } from "~/server/headscale/compatibility";
import { Capabilities } from "~/server/web/roles";
import cn from "~/utils/cn";

import type { Route } from "./+types/overview";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const getRequestApi = context.get(requestApiContext);
  const headscale = context.get(headscaleContext);

  const principal = await auth.require(request);
  if (!auth.can(principal, Capabilities.read_feature)) {
    throw new Error(
      "You do not have permission to view this page. Please contact your administrator.",
    );
  }

  const { api } = await getRequestApi(request);

  // The /api/v1/derp endpoint is new in this fork. Older servers return 404,
  // which we surface as a compatibility notice instead of an error page.
  let derp;
  try {
    derp = await api.derp.get();
  } catch {
    derp = null;
  }

  return {
    derp,
    version: headscale.version.raw,
    unsupported: unsupportedFor(headscale.version, "general"),
  };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  const { derp, version, unsupported } = loaderData;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <h1 className="mb-2 text-2xl font-medium">DERP Status</h1>
          <p>
            DERP (Designated Encrypted Relay for Packets) relays traffic when direct peer-to-peer
            connections cannot be established. Each region may contain multiple relay nodes for
            redundancy.
          </p>
        </div>
      </div>

      <CompatibilityNotice serverVersion={version} statuses={unsupported} />

      {derp === null ? (
        <EmptyState
          variant="error"
          title="DERP status unavailable"
          description="This Headscale server does not expose the DERP status endpoint. The endpoint is available in fork versions of Headscale."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="border-line bg-surface rounded-lg border p-4">
              <div className="text-muted flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4" />
                Status
              </div>
              <p
                className={cn(
                  "mt-1 text-lg font-semibold",
                  derp.configured ? "text-ok" : "text-faint",
                )}
              >
                {derp.configured ? "Configured" : "Not configured"}
              </p>
            </div>
            <div className="border-line bg-surface rounded-lg border p-4">
              <div className="text-muted flex items-center gap-2 text-sm">
                <Server className="h-4 w-4" />
                Regions
              </div>
              <p className="mt-1 text-lg font-semibold">{derp.totalRegions}</p>
            </div>
            <div className="border-line bg-surface rounded-lg border p-4">
              <div className="text-muted flex items-center gap-2 text-sm">
                <Server className="h-4 w-4" />
                Headscale Version
              </div>
              <p className="mt-1 text-lg font-semibold">{version}</p>
            </div>
          </div>

          {derp.regions.length === 0 ? (
            <EmptyState
              title="No DERP regions configured"
              description="No DERP relay regions are currently configured for this tailnet. DERP relays provide connectivity when direct peer-to-peer connections cannot be established."
            />
          ) : (
            <div className="flex flex-col gap-6">
              {derp.regions.map((region) => (
                <div className="border-line bg-surface rounded-lg border" key={region.regionId}>
                  <div className="border-line border-b px-4 py-3">
                    <h2 className="flex items-center gap-2 text-lg font-medium">
                      <Globe className="text-accent h-5 w-5" />
                      {region.regionName}
                      <span className="bg-subtle text-muted rounded-md px-2 py-0.5 font-mono text-xs">
                        ID: {region.regionId}
                      </span>
                      <Chip text={region.regionCode} />
                    </h2>
                  </div>
                  <div className="divide-line divide-y">
                    {region.nodes.map((node) => (
                      <div
                        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        key={node.name}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{node.name}</span>
                          <span className="text-muted text-sm">{node.hostName}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {node.derpPort > 0 ? (
                            <span className="bg-subtle rounded-md px-2 py-0.5 font-mono text-xs">
                              DERP port: {node.derpPort}
                            </span>
                          ) : null}
                          {node.stunPort > 0 ? (
                            <span className="bg-subtle rounded-md px-2 py-0.5 font-mono text-xs">
                              STUN port: {node.stunPort}
                            </span>
                          ) : null}
                          {node.ipv4 ? (
                            <span className="bg-accent-subtle text-accent rounded-md px-2 py-0.5 font-mono text-xs">
                              {node.ipv4}
                            </span>
                          ) : null}
                          {node.ipv6 ? (
                            <span className="bg-accent-subtle text-accent rounded-md px-2 py-0.5 font-mono text-xs">
                              {node.ipv6}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <PageError error={error} page="DERP Status" />;
}
