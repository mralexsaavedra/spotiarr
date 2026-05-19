import { describe, it, expect } from "vitest";
import { normalizeArtistName, namesMatch } from "./normalize-name";

describe("normalizeArtistName", () => {
  it("lowercases names", () => {
    expect(normalizeArtistName("Radiohead")).toBe("radiohead");
  });

  it("trims whitespace", () => {
    expect(normalizeArtistName("  The Beatles  ")).toBe("the beatles");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeArtistName("The   Beatles")).toBe("the beatles");
  });

  it("removes diacritics", () => {
    expect(normalizeArtistName("Beyoncé")).toBe("beyonce");
  });

  it("replaces punctuation with spaces", () => {
    expect(normalizeArtistName("AC/DC")).toBe("ac dc");
  });
});

describe("namesMatch", () => {
  it("returns true for exact matches after normalization", () => {
    expect(namesMatch("Radiohead", "radiohead")).toBe(true);
  });

  it("returns true when diacritics differ", () => {
    expect(namesMatch("Beyoncé", "Beyonce")).toBe(true);
  });

  it("returns true when whitespace differs", () => {
    expect(namesMatch("The Beatles", "the  beatles")).toBe(true);
  });

  it("returns true when punctuation differs", () => {
    expect(namesMatch("AC/DC", "ac dc")).toBe(true);
  });

  it("returns false for different names", () => {
    expect(namesMatch("Radiohead", "Coldplay")).toBe(false);
  });

  it("returns false for ambiguous near-matches", () => {
    // Strict matching requirement: ambiguous names must be rejected
    expect(namesMatch("The Beatles", "Beatles")).toBe(false);
    expect(namesMatch("Kanye West", "Kanye")).toBe(false);
  });

  it("returns false for substring matches", () => {
    expect(namesMatch("Arctic Monkeys", "Monkeys")).toBe(false);
  });
});
