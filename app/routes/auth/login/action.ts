import { redirect } from "react-router";

import { authContext, headscaleContext, localAdminContext } from "~/server/context";
import { headscaleErrorMessage, isDataWithApiError } from "~/server/headscale/api/error-client";
import log from "~/utils/log";

import type { Route } from "./+types/page";

/**
 * FORK-SPECIFIC FEATURE: Local Administrator Authentication (action handler)
 *
 * Handles both password authentication for local administrators and API key
 * authentication. See docs/MERGE-PRESERVATION.md Section 3.
 * DO NOT REMOVE DURING UPSTREAM MERGES.
 */
export async function loginAction({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const headscale = context.get(headscaleContext);
  const localAdmin = context.get(localAdminContext);

  const formData = await request.formData();
  const apiKey = formData.has("api_key") ? String(formData.get("api_key")).trim() : undefined;
  const username = formData.has("username") ? String(formData.get("username")).trim() : undefined;
  const password = formData.has("password") ? String(formData.get("password")) : undefined;

  // Password login flow - use local admin service if available
  if (password !== undefined) {
    if (!username || username.length === 0) {
      log.warn("auth", "Request made with empty username");
      return {
        success: false,
        message: "Username cannot be empty. Please enter a valid username.",
      };
    }

    if (password.length === 0) {
      log.warn("auth", "Request made with empty password");
      return {
        success: false,
        message: "Password cannot be empty. Please enter a valid password.",
      };
    }

    // Use local admin authentication if configured
    if (localAdmin?.state === "enabled") {
      const result = await localAdmin.value.authenticate(username, password);
      if (!result.success) {
        log.warn("auth", "Local admin authentication failed for user: %s", username);
        return {
          success: false,
          message: result.error || "Invalid username or password",
        };
      }

      // Create a password session with configured service API key
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return redirect("/machines", {
        headers: {
          "Set-Cookie": await auth.createPasswordSession("local-admin-token", username, maxAge),
        },
      });
    }

    // Local admin mode not configured
    return {
      success: false,
      message: "Password authentication is not available",
    };
  }

  // API key login flow
  if (apiKey === undefined) {
    log.warn("auth", "Request made without API key");
    log.warn(
      "auth",
      "If this is unexpected, ensure your reverse proxy (if applicable) is configured correctly",
    );
    return {
      success: false,
      message: "Enter an API key.",
    };
  }

  if (apiKey.length === 0) {
    log.warn("auth", "Request made with empty API key");
    log.warn(
      "auth",
      "If this is unexpected, ensure your reverse proxy (if applicable) is configured correctly",
    );
    return {
      success: false,
      message: "Enter an API key.",
    };
  }

  // We need to make sure this is safe for HTTP headers
  if (!/^[\x21-\x7e]+$/.test(apiKey)) {
    return {
      success: false,
      message: "That API key is invalid or has expired.",
    };
  }

  // Build a client with the candidate API key the user just submitted, so the
  // GET /api/v1/apikey call below validates the key against Headscale itself.
  const api = headscale.client(apiKey);
  try {
    const apiKeys = await api.apiKeys.list();

    // We don't need to check for 0 API keys because this request cannot
    // be authenticated correctly without an API key
    //
    // 0.28.0 pointlessly added asterisks to the prefixes of API keys, which is
    // the dumbest thing I've ever seen.
    const lookup = apiKeys.find((key) => apiKey.startsWith(key.prefix.replaceAll("*", "")));
    if (!lookup) {
      return {
        success: false,
        message: "That API key doesn't exist on this server.",
      };
    }

    if (lookup.expiration === null || lookup.expiration === undefined) {
      log.error("auth", "Got an API key without an expiration");
      return {
        success: false,
        message: "That API key has no expiration. Create a new one.",
      };
    }

    const expiry = new Date(lookup.expiration);
    if (expiry.getTime() < Date.now()) {
      return {
        success: false,
        message: "That API key has expired.",
      };
    }

    return redirect("/machines", {
      headers: {
        "Set-Cookie": await auth.createApiKeySession(
          apiKey,
          `${lookup.prefix}...`,
          expiry.getTime() - Date.now(),
        ),
      },
    });
  } catch (error) {
    // Check if this is a React Router DataWithResponseInit wrapping a Headscale API error
    if (isDataWithApiError(error)) {
      const apiError = error.data;
      // TODO: What in gods name is wrong with the headscale API?
      if (
        apiError.statusCode === 401 ||
        apiError.statusCode === 403 ||
        (apiError.statusCode === 500 && apiError.rawData.trim() === "Unauthorized")
      ) {
        return {
          success: false,
          message: "That API key is invalid or has expired.",
        };
      }
    }

    log.error(
      "auth",
      "Error while validating API key: %s",
      headscaleErrorMessage(error) ?? String(error),
    );
    log.debug("auth", "Error details: %o", error);
    return {
      success: false,
      message: "Couldn't check the API key. See the server logs.",
    };
  }
}
