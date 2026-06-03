import type {
  CatalogSearchPort,
  CatalogSearchResult,
} from "@/application/ports/catalog-search.port";
import type { SpotifySearchClient } from "../../spotify-search.client";

/**
 * Thin wrapper around SpotifySearchClient that implements CatalogSearchPort.
 *
 * This adapter exists only for the SEARCH_PROVIDER=spotify rollout period.
 * It will be deleted in PR-3.4 once Deezer-first is the permanent default.
 */
export class SpotifyCatalogSearchAdapter implements CatalogSearchPort {
  constructor(private readonly spotifySearchClient: SpotifySearchClient) {}

  async searchCatalog(
    query: string,
    types: string[],
    limits: { track?: number; album?: number; artist?: number },
  ): Promise<CatalogSearchResult> {
    return this.spotifySearchClient.searchCatalog(query, types, limits);
  }
}
