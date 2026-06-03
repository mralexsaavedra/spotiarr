import { TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Track } from "@/types";
import { useLocalTrackPlaybackController } from "./useLocalTrackPlaybackController";

const tracks: Track[] = [
  {
    id: "track-1",
    name: "Track 1",
    artist: "Artist 1",
    album: "Album 1",
    durationMs: 180000,
    status: TrackStatusEnum.Completed,
    trackUrl: "https://open.spotify.com/track/1",
    audioUrl: "/api/library/audio?path=%2Ftmp%2F01.mp3",
  },
  {
    id: "track-2",
    name: "Track 2",
    artist: "Artist 2",
    album: "Album 2",
    durationMs: 200000,
    status: TrackStatusEnum.Completed,
    trackUrl: "https://open.spotify.com/track/2",
    audioUrl: "/api/library/audio?path=%2Ftmp%2F02.mp3",
  },
  {
    id: "track-3",
    name: "Track 3",
    artist: "Artist 3",
    album: "Album 3",
    durationMs: 210000,
    status: TrackStatusEnum.Completed,
    trackUrl: "https://open.spotify.com/track/3",
  },
];

const instrumentAudioElement = (audio: HTMLAudioElement) => {
  let srcValue = "";
  let currentTimeValue = 0;
  let mediaError: MediaError | null = null;

  Object.defineProperty(audio, "src", {
    configurable: true,
    get: () => srcValue,
    set: (value: string) => {
      srcValue = value;
      currentTimeValue = 0;
    },
  });

  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value: number) => {
      currentTimeValue = value;
    },
  });

  Object.defineProperty(audio, "error", {
    configurable: true,
    get: () => mediaError,
    set: (value: MediaError | null) => {
      mediaError = value;
    },
  });
};

describe("useLocalTrackPlaybackController", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("plays, pauses, and resumes the same track without resetting progress", async () => {
    const playMock = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const audioElement = document.createElement("audio");

    instrumentAudioElement(audioElement);

    const { result } = renderHook(() =>
      useLocalTrackPlaybackController({
        tracks,
        scopeKey: "album-1",
        errorKeyPrefix: "library.album",
        getAudioUrl: (track) => track.audioUrl,
      }),
    );

    act(() => {
      result.current.setAudioElement(audioElement);
    });

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(result.current.currentTrackId).toBe("track-1");
    expect(result.current.audioSrc).toBe(tracks[0]?.audioUrl);

    act(() => {
      result.current.onAudioPlay();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      audioElement.currentTime = 42;
      result.current.onPauseTrack();
    });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
    expect(audioElement.currentTime).toBe(42);
  });

  it("switches tracks, ignores stale AbortError rejections, and resets when the scope changes", async () => {
    const firstPlayController: { reject: null | ((reason?: unknown) => void) } = { reject: null };
    const playMock = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            firstPlayController.reject = reject;
          }),
      )
      .mockResolvedValue(undefined);
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const audioElement = document.createElement("audio");

    instrumentAudioElement(audioElement);

    const { result, rerender, unmount } = renderHook(
      ({ scopeKey }) =>
        useLocalTrackPlaybackController({
          tracks,
          scopeKey,
          errorKeyPrefix: "library.album",
          getAudioUrl: (track) => track.audioUrl,
        }),
      {
        initialProps: { scopeKey: "album-1" },
      },
    );

    act(() => {
      result.current.setAudioElement(audioElement);
    });

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.onPlayTrack("track-2");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));

    act(() => {
      firstPlayController.reject?.(new DOMException("Interrupted", "AbortError"));
    });

    await waitFor(() => expect(audioElement.src).toContain("%2Ftmp%2F02.mp3"));
    expect(result.current.playbackError).toBeNull();

    rerender({ scopeKey: "album-2" });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.isPlaying).toBe(false);

    unmount();

    expect(pauseMock).toHaveBeenCalledTimes(2);
  });

  it("maps unavailable and blocked playback failures to scoped error keys", async () => {
    const playMock = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("Playback blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);
    const audioElement = document.createElement("audio");

    instrumentAudioElement(audioElement);

    const { result } = renderHook(() =>
      useLocalTrackPlaybackController({
        tracks,
        scopeKey: "album-1",
        errorKeyPrefix: "library.album",
        getAudioUrl: (track) => track.audioUrl,
      }),
    );

    act(() => {
      result.current.setAudioElement(audioElement);
    });

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.playbackError).toBe("library.album.playbackBlocked"));

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.audioSrc).toBeNull();
    expect(result.current.playbackError).toBe("library.album.playbackUnavailable");
  });

  it("stops and clears active playback when selecting a track without audio", async () => {
    const playMock = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const audioElement = document.createElement("audio");

    instrumentAudioElement(audioElement);

    const { result } = renderHook(() =>
      useLocalTrackPlaybackController({
        tracks,
        scopeKey: "album-1",
        errorKeyPrefix: "library.album",
        getAudioUrl: (track) => track.audioUrl,
      }),
    );

    act(() => {
      result.current.setAudioElement(audioElement);
    });

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.onAudioPlay();
    });

    expect(result.current.currentTrackId).toBe("track-1");
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.audioSrc).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.playbackError).toBe("library.album.playbackUnavailable");
  });

  it("keeps unavailable error when a stale pending playback later rejects", async () => {
    const firstPlayController: { reject: null | ((reason?: unknown) => void) } = { reject: null };
    const playMock = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          firstPlayController.reject = reject;
        }),
    );
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const audioElement = document.createElement("audio");

    instrumentAudioElement(audioElement);

    const { result } = renderHook(() =>
      useLocalTrackPlaybackController({
        tracks,
        scopeKey: "album-1",
        errorKeyPrefix: "library.album",
        getAudioUrl: (track) => track.audioUrl,
      }),
    );

    act(() => {
      result.current.setAudioElement(audioElement);
    });

    act(() => {
      result.current.onPlayTrack("track-1");
    });

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.playbackError).toBe("library.album.playbackUnavailable");

    await act(async () => {
      firstPlayController.reject?.(new DOMException("Playback blocked", "NotAllowedError"));
      await Promise.resolve();
    });

    expect(result.current.playbackError).toBe("library.album.playbackUnavailable");
    expect(result.current.isPlaying).toBe(false);
  });
});
