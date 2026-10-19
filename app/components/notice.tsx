import Callout, { type CalloutProps } from "~/components/callout";

/**
 * Notice is an alias for Callout with a default "info" variant.
 * Used for informational messages throughout the app.
 */
export default function Notice({ variant = "info", ...props }: CalloutProps) {
  return <Callout variant={variant} {...props} />;
}
