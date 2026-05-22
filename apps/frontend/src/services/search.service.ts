import { ApiRoutes, type SpotifySearchResults } from "@spotiarr/shared";
import { APP_CONFIG } from "@/config/app";
import { httpClient } from "./httpClient";

export const SearchService = {
  searchCatalog: async (
    query: string,
    types?: string[],
    limit: number = APP_CONFIG.SEARCH.DEFAULT_LIMIT,
  ): Promise<SpotifySearchResults> => {
    let url = `${ApiRoutes.SEARCH}?q=${encodeURIComponent(query)}&limit=${limit}`;
    if (types && types.length > 0) {
      url += `&types=${types.join(",")}`;
    }
    const response = await httpClient.get<{ data: SpotifySearchResults }>(url);
    return response.data;
  },
};
