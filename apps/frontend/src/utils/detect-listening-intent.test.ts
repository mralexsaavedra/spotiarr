import { describe, expect, it } from "vitest";
import { detectListeningIntent } from "./detect-listening-intent";

describe("detectListeningIntent", () => {
  // --- No match → null ---
  it("returns null for an unrelated prompt", () => {
    expect(detectListeningIntent("play some jazz music")).toEqual({ scope: null });
  });

  it("returns null for an empty string", () => {
    expect(detectListeningIntent("")).toEqual({ scope: null });
  });

  // --- tracks scope (EN) ---
  it("returns tracks for 'my most listened songs'", () => {
    expect(detectListeningIntent("my most listened songs")).toEqual({ scope: "tracks" });
  });

  it("returns tracks for 'top tracks'", () => {
    expect(detectListeningIntent("top tracks")).toEqual({ scope: "tracks" });
  });

  it("returns tracks for 'most played songs'", () => {
    expect(detectListeningIntent("most played songs")).toEqual({ scope: "tracks" });
  });

  it("returns tracks for 'my favorite tracks lately'", () => {
    expect(detectListeningIntent("generate a playlist from my top tracks")).toEqual({
      scope: "tracks",
    });
  });

  // --- tracks scope (ES) ---
  it("returns tracks for 'mis canciones más escuchadas' (ES)", () => {
    expect(detectListeningIntent("mis canciones más escuchadas")).toEqual({ scope: "tracks" });
  });

  it("returns tracks for 'temas más escuchados' (ES)", () => {
    expect(detectListeningIntent("temas más escuchados")).toEqual({ scope: "tracks" });
  });

  // --- artists scope (EN) ---
  it("returns artists for 'my most listened artists'", () => {
    expect(detectListeningIntent("my most listened artists")).toEqual({ scope: "artists" });
  });

  it("returns artists for 'top artists'", () => {
    expect(detectListeningIntent("top artists")).toEqual({ scope: "artists" });
  });

  it("returns artists for 'my favorite bands'", () => {
    expect(detectListeningIntent("playlist based on my favorite bands")).toEqual({
      scope: "artists",
    });
  });

  // --- artists scope (ES) ---
  it("returns artists for 'mis artistas más escuchados' (ES)", () => {
    expect(detectListeningIntent("mis artistas más escuchados")).toEqual({ scope: "artists" });
  });

  it("returns artists for 'grupos más escuchados' (ES)", () => {
    expect(detectListeningIntent("grupos más escuchados")).toEqual({ scope: "artists" });
  });

  // --- both scope: generic top/most-listened with no specific noun ---
  it("returns both for 'my most listened'", () => {
    expect(detectListeningIntent("my most listened")).toEqual({ scope: "both" });
  });

  it("returns both for 'based on what I listen to most'", () => {
    expect(detectListeningIntent("based on what I listen to most")).toEqual({ scope: "both" });
  });

  it("returns both for 'lo que más escucho' (ES)", () => {
    expect(detectListeningIntent("hazme una playlist con lo que más escucho")).toEqual({
      scope: "both",
    });
  });

  // --- case insensitivity ---
  it("is case-insensitive for EN", () => {
    expect(detectListeningIntent("My Top Tracks")).toEqual({ scope: "tracks" });
  });

  it("is case-insensitive for ES", () => {
    expect(detectListeningIntent("Mis Artistas Más Escuchados")).toEqual({ scope: "artists" });
  });

  // --- false-positive guard: standalone "most" without listened/played context ---
  it("returns null for 'songs I like most' (standalone most is not a top-signal)", () => {
    expect(detectListeningIntent("songs I like most")).toEqual({ scope: null });
  });

  // --- false-positive guard: "top" without music context ---
  it("returns null for 'top of the morning' (top without music noun)", () => {
    expect(detectListeningIntent("top of the morning")).toEqual({ scope: null });
  });

  // --- false-positive guard: "favorite" / "favourites" without a music noun ---
  // "play my favorites" is ambiguous — the user might mean favorite anything.
  // Without a music noun in proximity the signal must NOT fire.
  it("returns null for 'play my favorites' (no music noun, ambiguous favorite)", () => {
    expect(detectListeningIntent("play my favorites")).toEqual({ scope: null });
  });

  it("returns null for 'my favourites' (no music noun)", () => {
    expect(detectListeningIntent("my favourites")).toEqual({ scope: null });
  });

  it("returns null for 'favorite' alone (no music noun)", () => {
    expect(detectListeningIntent("favorite")).toEqual({ scope: null });
  });

  // favorite + music noun should still produce a scoped result
  it("returns tracks for 'my favorite songs' (favorite + track noun)", () => {
    expect(detectListeningIntent("my favorite songs")).toEqual({ scope: "tracks" });
  });

  it("returns artists for 'my favorite artists' (favorite + artist noun)", () => {
    expect(detectListeningIntent("my favorite artists")).toEqual({ scope: "artists" });
  });
});
