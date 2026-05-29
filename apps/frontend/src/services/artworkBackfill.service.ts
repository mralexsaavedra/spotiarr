import {
  ApiRoutes,
  ApiSuccess,
  ArtworkBackfillStartResponse,
  ArtworkBackfillStatusResponse,
} from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export async function fetchArtworkBackfillStatus(): Promise<ArtworkBackfillStatusResponse> {
  const result = await httpClient.get<ApiSuccess<ArtworkBackfillStatusResponse>>(
    `${ApiRoutes.LIBRARY}/artwork-backfill/status`,
  );
  return result.data;
}

export async function startArtworkBackfill(): Promise<ArtworkBackfillStartResponse> {
  const result = await httpClient.post<ApiSuccess<ArtworkBackfillStartResponse>>(
    `${ApiRoutes.LIBRARY}/artwork-backfill/start`,
  );
  return result.data;
}
