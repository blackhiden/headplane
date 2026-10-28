import { useEffect, useState } from "react";

import ServerInfoCard, { formatBytes, formatDeploymentMode } from "~/components/server-info-card";

interface HeadplaneServerInfo {
  version: string;
  nodeVersion: string;
  os: string;
  osRelease: string;
  platform: string;
  architecture: string;
  cpuCount: number;
  totalMemory: number;
  deploymentMode: string;
}

interface HeadscaleServerInfo {
  version?: string;
  buildTime?: string;
  commit?: string;
  goVersion?: string;
  platform?: string;
  architecture?: string;
  cpuCount?: number;
  totalMemory?: number;
  totalStorage?: number;
  deploymentMode?: string;
  dockerVersion?: string;
  publicIp?: string;
}

interface ServerInfoResponse {
  headplane: HeadplaneServerInfo;
  headscale: HeadscaleServerInfo | null;
  error?: string;
}

export default function TechnicalInfoSection() {
  const [serverInfo, setServerInfo] = useState<ServerInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const response = await fetch(`${__PREFIX__}/api/admin/server-info`);
        if (!response.ok) {
          throw new Error(`Failed to fetch server info: ${response.statusText}`);
        }
        const data = await response.json();
        setServerInfo(data);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchServerInfo();
  }, []);

  if (loading) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Technical Information</h2>
        <p className="text-muted mt-1 text-sm">Loading server information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <h2 className="text-lg font-semibold">Technical Information</h2>
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
          Failed to load server information: {error}
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return null;
  }

  const headplaneFields = [
    { label: "Version", value: serverInfo.headplane.version },
    { label: "Node.js Version", value: serverInfo.headplane.nodeVersion },
    { label: "Operating System", value: serverInfo.headplane.os },
    { label: "OS Release", value: serverInfo.headplane.osRelease },
    { label: "Platform", value: serverInfo.headplane.platform },
    { label: "Architecture", value: serverInfo.headplane.architecture },
    { label: "CPU Cores", value: serverInfo.headplane.cpuCount },
    {
      label: "Total Memory",
      value: serverInfo.headplane.totalMemory,
      format: formatBytes,
    },
    {
      label: "Deployment Mode",
      value: serverInfo.headplane.deploymentMode,
      format: formatDeploymentMode,
    },
  ];

  const headscaleFields = serverInfo.headscale
    ? [
        { label: "Version", value: serverInfo.headscale.version },
        { label: "Build Time", value: serverInfo.headscale.buildTime },
        { label: "Commit", value: serverInfo.headscale.commit },
        { label: "Go Version", value: serverInfo.headscale.goVersion },
        { label: "Platform", value: serverInfo.headscale.platform },
        { label: "Architecture", value: serverInfo.headscale.architecture },
        ...(serverInfo.headscale.cpuCount !== undefined
          ? [{ label: "CPU Cores", value: serverInfo.headscale.cpuCount }]
          : []),
        ...(serverInfo.headscale.totalMemory !== undefined && serverInfo.headscale.totalMemory > 0
          ? [
              {
                label: "Total Memory",
                value: serverInfo.headscale.totalMemory,
                format: formatBytes,
              },
            ]
          : []),
        ...(serverInfo.headscale.totalStorage !== undefined && serverInfo.headscale.totalStorage > 0
          ? [
              {
                label: "Total Storage",
                value: serverInfo.headscale.totalStorage,
                format: formatBytes,
              },
            ]
          : []),
        ...(serverInfo.headscale.deploymentMode
          ? [
              {
                label: "Deployment Mode",
                value: serverInfo.headscale.deploymentMode,
                format: formatDeploymentMode,
              },
            ]
          : []),
        ...(serverInfo.headscale.publicIp
          ? [{ label: "Public IP", value: serverInfo.headscale.publicIp }]
          : []),
      ]
    : [];

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold">Technical Information</h2>
      <p className="text-muted mt-1 text-sm">
        Server specifications and technical details for both Headplane and Headscale.
      </p>

      <ServerInfoCard
        title="Headplane Server"
        description="Headplane web application server details"
        fields={headplaneFields}
      />

      <ServerInfoCard
        title="Headscale Server"
        description="Headscale control server details"
        fields={headscaleFields}
        unavailable={!serverInfo.headscale}
        error={serverInfo.error}
      />
    </div>
  );
}
