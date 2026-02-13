import {
  ApiRoutes,
  ApiSuccess,
  LibraryArtist,
  LibraryScanResult,
  LibraryStats,
} from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export async function fetchLibraryStats(): Promise<LibraryStats> {
  const result = await httpClient.get<ApiSuccess<LibraryStats>>(`${ApiRoutes.LIBRARY}/stats`);
  return result.data;
}

export async function fetchLibraryArtists(): Promise<LibraryArtist[]> {
  const result = await httpClient.get<ApiSuccess<LibraryArtist[]>>(`${ApiRoutes.LIBRARY}/artists`);
  return result.data;
}

export async function fetchLibraryArtist(libraryData: {
  name: string;
  path: string;
}): Promise<LibraryArtist> {
  const name = encodeURIComponent(libraryData.name);
  const result = await httpClient.get<ApiSuccess<LibraryArtist>>(
    `${ApiRoutes.LIBRARY}/artists/${name}`,
  );
  return result.data;
}

export async function scanLibrary(): Promise<LibraryScanResult> {
  const result = await httpClient.post<ApiSuccess<LibraryScanResult>>(`${ApiRoutes.LIBRARY}/scan`);
  return result.data;
}
