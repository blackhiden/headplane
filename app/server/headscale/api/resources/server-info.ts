import type { Transport } from "../transport";

export interface ServerInfoResponse {
  version?: string;
  buildTime?: string;
  commit?: string;
  goVersion?: string;
  platform?: string;
  architecture?: string;
}

export interface ServerInfoApi {
  get(): Promise<ServerInfoResponse>;
}

export function makeServerInfoApi(transport: Transport, apiKey: string): ServerInfoApi {
  return {
    get: async () => {
      return transport.request<ServerInfoResponse>({
        method: "GET",
        path: "v1/server-info",
        apiKey,
      });
    },
  };
}
