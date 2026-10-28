import Card from "~/components/card";
import cn from "~/utils/cn";

interface ServerInfoField {
  label: string;
  value: string | number | undefined | null;
  format?: (value: any) => string;
}

interface ServerInfoCardProps {
  title: string;
  description?: string;
  fields: ServerInfoField[];
  className?: string;
  unavailable?: boolean;
  error?: string;
}

export default function ServerInfoCard({
  title,
  description,
  fields,
  className,
  unavailable = false,
  error,
}: ServerInfoCardProps) {
  return (
    <Card className={cn("mt-6 w-full max-w-none", className)}>
      <Card.Title>{title}</Card.Title>
      {description && <Card.Text>{description}</Card.Text>}

      {error && (
        <div className="text-muted mt-4 rounded-md bg-yellow-50 p-3 text-sm dark:bg-yellow-950/20">
          {error}
        </div>
      )}

      {unavailable ? (
        <div className="text-muted mt-4 text-sm">Server information unavailable</div>
      ) : (
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {fields.map((field, index) => (
            <div key={index} className="border-line border-b pb-3 last:border-b-0">
              <dt className="text-faint text-xs font-medium tracking-wide uppercase">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {field.value !== undefined && field.value !== null
                  ? field.format
                    ? field.format(field.value)
                    : String(field.value)
                  : "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

// Utility functions for formatting values
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function formatDeploymentMode(mode: string): string {
  switch (mode) {
    case "docker":
      return "Docker";
    case "native":
      return "Native";
    case "kubernetes":
      return "Kubernetes";
    default:
      return "Unknown";
  }
}
