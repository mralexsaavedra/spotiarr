/**
 * Tests for useAlbumDetailController.
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
// import { useAlbumDetailController } from "./useAlbumDetailController";
// import { queryClient } from "@/test-utils/queryClient";

// Scenario: tracks load from useAlbumTracksQuery and surface via controller
// GIVEN artistId and albumId in route params
// WHEN useAlbumTracksQuery resolves with tracks
// THEN controller.tracks has same length and fields as the raw tracks

// Scenario: handleDownload dispatches album kind mutation (no Spotify URL required)
// GIVEN an album detail page is open for any album
// WHEN handleDownload() is called
// THEN createPlaylist.mutate is called with { kind: "album", artistId, albumId }
// AND no Spotify URL resolution occurs

// Scenario: handleDownload when album has no spotifyUrl
// GIVEN album.spotifyUrl is undefined
// WHEN handleDownload() is called
// THEN createPlaylist.mutate({ kind: "album", artistId, albumId }) is dispatched directly
// AND the download proceeds without any Spotify API call

// Scenario: handleDownload when album has a spotifyUrl
// GIVEN album.spotifyUrl is "https://open.spotify.com/album/abc"
// WHEN handleDownload() is called
// THEN createPlaylist.mutate({ kind: "album", artistId, albumId }) is still dispatched
// (backend uses album ref path regardless of spotifyUrl availability)

// Scenario: isButtonLoading reflects createPlaylist.isPending
// GIVEN createPlaylist.isPending is true
// WHEN isButtonLoading is read
// THEN isButtonLoading is true

// Scenario: empty tracks (use case returns [])
// GIVEN useAlbumTracksQuery resolves with []
// WHEN the controller renders
// THEN controller.tracks is []
// AND no error is thrown

// Scenario: deep-link cold path
// GIVEN useArtistAlbumsQuery has not yet resolved when controller first renders
// WHEN useArtistAlbumsQuery resolves with albums including the target albumId
// THEN controller.album hydrates with the matching album entry
// AND playlist is built from that album's metadata

export {};
