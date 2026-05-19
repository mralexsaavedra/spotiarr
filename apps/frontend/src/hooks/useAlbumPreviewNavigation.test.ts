/**
 * Tests for useAlbumPreviewNavigation.
 *
 * NOTE: The frontend workspace does not have a vitest setup yet.
 * These tests document the expected behaviour and serve as a reference
 * for when a test runner is configured.
 *
 * To run, add vitest + @testing-library/react-hooks to the frontend workspace
 * and update package.json scripts with `"test": "vitest"`.
 */

// import { renderHook, act } from "@testing-library/react-hooks";
// import { vi, describe, it, expect, beforeEach } from "vitest";
// import { useAlbumPreviewNavigation } from "./useAlbumPreviewNavigation";
// import { Path } from "@/routes/routes";
// import type { ArtistRelease } from "@spotiarr/shared";

// Helper: make a minimal ArtistRelease
// function makeAlbum(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
//   return {
//     artistId: "artist-1",
//     artistName: "Test Artist",
//     artistImageUrl: null,
//     albumId: "album-1",
//     albumName: "Test Album",
//     coverUrl: null,
//     ...overrides,
//   };
// }

// Scenario: album with spotifyUrl + existing saved playlist -> navigate to PLAYLIST_DETAIL
// GIVEN playlists has an entry with spotifyUrl matching the album
// WHEN navigateToAlbumPreview(album) is called
// THEN navigate is called with Path.PLAYLIST_DETAIL.replace(":id", playlist.id)

// Scenario: album with spotifyUrl + no existing saved playlist -> navigate to PLAYLIST_PREVIEW
// GIVEN playlists is empty
// AND album.spotifyUrl is set
// WHEN navigateToAlbumPreview(album) is called
// THEN navigate is called with `${Path.PLAYLIST_PREVIEW}?url=<encoded spotifyUrl>`

// Scenario: album without spotifyUrl -> navigate to ALBUM_DETAIL directly
// GIVEN album.spotifyUrl is undefined
// WHEN navigateToAlbumPreview(album) is called
// THEN navigate is called with "/album/artist-1/album-1"

export {};
