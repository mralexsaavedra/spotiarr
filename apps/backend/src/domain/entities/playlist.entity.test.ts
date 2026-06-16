import {
  PlaylistStatusEnum,
  PlaylistTypeEnum,
  TrackStatusEnum,
  type IPlaylist,
  type ITrack,
} from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import { Playlist } from "./playlist.entity";

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "track-1",
    name: "Track Name",
    artist: "Artist",
    status: TrackStatusEnum.New,
    ...overrides,
  };
}

function makePlaylist(overrides: Partial<IPlaylist> = {}): IPlaylist {
  return {
    id: "playlist-1",
    name: "My Playlist",
    type: PlaylistTypeEnum.Playlist,
    spotifyUrl: "https://open.spotify.com/playlist/abc123",
    subscribed: false,
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe("Playlist getters", () => {
  it("returns all values from props", () => {
    const props = makePlaylist({
      id: "pl-42",
      name: "Test Playlist",
      type: PlaylistTypeEnum.Album,
      spotifyUrl: "https://open.spotify.com/album/abc",
      error: undefined,
      subscribed: true,
      coverUrl: "https://cover.url",
      artistImageUrl: "https://artist.url",
      owner: "user-1",
      ownerUrl: "https://open.spotify.com/user/user-1",
      createdAt: 9999,
    });
    const playlist = new Playlist(props);

    expect(playlist.id).toBe("pl-42");
    expect(playlist.name).toBe("Test Playlist");
    expect(playlist.type).toBe(PlaylistTypeEnum.Album);
    expect(playlist.spotifyUrl).toBe("https://open.spotify.com/album/abc");
    expect(playlist.error).toBeUndefined();
    expect(playlist.subscribed).toBe(true);
    expect(playlist.coverUrl).toBe("https://cover.url");
    expect(playlist.artistImageUrl).toBe("https://artist.url");
    expect(playlist.owner).toBe("user-1");
    expect(playlist.ownerUrl).toBe("https://open.spotify.com/user/user-1");
    expect(playlist.createdAt).toBe(9999);
  });
});

describe("Playlist.updateDetails", () => {
  it("mutates name, type, coverUrl, artistImageUrl, owner, ownerUrl", () => {
    const playlist = new Playlist(makePlaylist());
    playlist.updateDetails(
      "New Name",
      PlaylistTypeEnum.Artist,
      "https://new-cover.url",
      "https://new-artist.url",
      "owner-2",
      "https://open.spotify.com/user/owner-2",
    );

    expect(playlist.name).toBe("New Name");
    expect(playlist.type).toBe(PlaylistTypeEnum.Artist);
    expect(playlist.coverUrl).toBe("https://new-cover.url");
    expect(playlist.artistImageUrl).toBe("https://new-artist.url");
    expect(playlist.owner).toBe("owner-2");
    expect(playlist.ownerUrl).toBe("https://open.spotify.com/user/owner-2");
  });

  it("clears the error field after update", () => {
    const playlist = new Playlist(makePlaylist({ error: "some error" }));
    playlist.updateDetails("Updated", PlaylistTypeEnum.Playlist);
    expect(playlist.error).toBeUndefined();
  });
});

describe("Playlist.markAsSubscribed / markAsUnsubscribed", () => {
  it("markAsSubscribed sets subscribed to true", () => {
    const playlist = new Playlist(makePlaylist({ subscribed: false }));
    playlist.markAsSubscribed();
    expect(playlist.subscribed).toBe(true);
  });

  it("markAsUnsubscribed sets subscribed to false", () => {
    const playlist = new Playlist(makePlaylist({ subscribed: true }));
    playlist.markAsUnsubscribed();
    expect(playlist.subscribed).toBe(false);
  });
});

describe("Playlist.markAsError", () => {
  it("sets the error field", () => {
    const playlist = new Playlist(makePlaylist());
    playlist.markAsError("sync failed");
    expect(playlist.error).toBe("sync failed");
  });
});

describe("Playlist.toPrimitive", () => {
  it("returns a shallow copy of props", () => {
    const props = makePlaylist({ name: "Original" });
    const playlist = new Playlist(props);
    const result = playlist.toPrimitive();

    expect(result).toEqual(props);
    expect(result).not.toBe(props);
  });
});

describe("Playlist.calculateStatus", () => {
  it("returns Error when error is set", () => {
    const playlist = new Playlist(makePlaylist({ error: "sync failed" }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.Error);
  });

  it("returns Completed when all tracks are Completed", () => {
    const tracks = [
      makeTrack({ status: TrackStatusEnum.Completed }),
      makeTrack({ id: "track-2", status: TrackStatusEnum.Completed }),
    ];
    const playlist = new Playlist(makePlaylist({ tracks }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.Completed);
  });

  it("returns Warning when any track has Error status (but not all completed)", () => {
    const tracks = [
      makeTrack({ status: TrackStatusEnum.Completed }),
      makeTrack({ id: "track-2", status: TrackStatusEnum.Error }),
    ];
    const playlist = new Playlist(makePlaylist({ tracks }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.Warning);
  });

  it("returns Subscribed when subscribed is true and no tracks have Error", () => {
    const playlist = new Playlist(makePlaylist({ subscribed: true, tracks: [] }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.Subscribed);
  });

  it("returns InProgress when not subscribed and no special conditions", () => {
    const tracks = [makeTrack({ status: TrackStatusEnum.Downloading })];
    const playlist = new Playlist(makePlaylist({ subscribed: false, tracks }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.InProgress);
  });

  it("returns InProgress when tracks is undefined and not subscribed", () => {
    const playlist = new Playlist(makePlaylist({ tracks: undefined, subscribed: false }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.InProgress);
  });

  it("returns InProgress when tracks is empty and not subscribed", () => {
    const playlist = new Playlist(makePlaylist({ tracks: [], subscribed: false }));
    expect(playlist.calculateStatus()).toBe(PlaylistStatusEnum.InProgress);
  });
});
