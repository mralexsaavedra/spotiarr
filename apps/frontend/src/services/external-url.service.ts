import { ApiRoutes } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export interface ResolveExternalUrlParams {
  provider: "spotify" | "deezer";
  type: "artist" | "album" | "track";
  id: string;
  name?: string;
  artistName?: string;
}

export interface ResolvedExternalUrl {
  url: string;
}

export const externalUrlService = {
  resolve: async (params: ResolveExternalUrlParams): Promise<ResolvedExternalUrl> => {
    const query = new URLSearchParams({
      provider: params.provider,
      type: params.type,
      id: params.id,
    });
    if (params.name) query.set("name", params.name);
    if (params.artistName) query.set("artist", params.artistName);

    return httpClient.get<ResolvedExternalUrl>(`${ApiRoutes.EXTERNAL_URL}?${query.toString()}`);
  },
};
