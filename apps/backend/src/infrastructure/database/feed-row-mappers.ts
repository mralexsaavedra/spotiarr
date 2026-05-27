import type { ArtistRelease } from "@spotiarr/shared";

const DEEZER_CDN_HOST = "cdns-images.dzcdn.net";
const DEEZER_API_IMAGE = /^https?:\/\/api\.deezer\.com\/album\/\d+\/image\b/;
const DEEZER_SIZE_SEGMENT = /\/\d+x\d+-/;

function upgradeDeezerCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (DEEZER_API_IMAGE.test(url)) {
    const [base, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.set("size", "xl");
    return `${base}?${params.toString()}`;
  }

  if (url.includes(DEEZER_CDN_HOST)) {
    return url.replace(DEEZER_SIZE_SEGMENT, "/1000x1000-");
  }

  return url;
}

export interface ArtistReleaseRow {
  artistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  artist?: { name: string; imageUrl: string | null };
  artistName?: string;
  artistImageUrl?: string | null;
}

export interface ArtistAlbumRow {
  spotifyArtistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  totalTracks: number | null;
}

export function mapArtistReleaseRow(row: ArtistReleaseRow): ArtistRelease {
  return {
    artistId: row.artistId,
    artistName: row.artist?.name ?? row.artistName ?? "Unknown Artist",
    artistImageUrl: row.artist?.imageUrl ?? row.artistImageUrl ?? null,
    albumId: row.albumId,
    albumName: row.albumName,
    albumType: row.albumType as ArtistRelease["albumType"],
    releaseDate: row.releaseDate ?? undefined,
    coverUrl: upgradeDeezerCoverUrl(row.coverUrl),
    spotifyUrl: row.spotifyUrl ?? undefined,
  };
}

export function mapArtistAlbumRowToRelease(
  row: ArtistAlbumRow,
  artistMeta?: { name?: string | null; imageUrl?: string | null },
): ArtistRelease {
  return {
    artistId: row.spotifyArtistId,
    artistName: artistMeta?.name ?? "Unknown Artist",
    artistImageUrl: artistMeta?.imageUrl ?? null,
    albumId: row.albumId,
    albumName: row.albumName,
    albumType: row.albumType as ArtistRelease["albumType"],
    releaseDate: row.releaseDate ?? undefined,
    coverUrl: upgradeDeezerCoverUrl(row.coverUrl),
    spotifyUrl: row.spotifyUrl ?? undefined,
    totalTracks: row.totalTracks ?? undefined,
  };
}
