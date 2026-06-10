import { describe, it, expect, beforeEach, vi } from "vitest";
import { signCookie, verifyCookie, COOKIE_NAME } from "./cookie";

const SECRET = "test-secret-key-for-signing";

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe("COOKIE_NAME", () => {
  it("is spotiarr_session", () => {
    expect(COOKIE_NAME).toBe("spotiarr_session");
  });
});

describe("signCookie / verifyCookie round-trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the original payload after sign → verify", () => {
    const now = nowSeconds();
    const payload = { iat: now, exp: now + 3600 };
    const cookie = signCookie(payload, SECRET);
    const result = verifyCookie(cookie, SECRET);

    expect(result).not.toBeNull();
    expect(result!.iat).toBe(payload.iat);
    expect(result!.exp).toBe(payload.exp);
  });

  it("returns null when the signature is tampered", () => {
    const now = nowSeconds();
    const cookie = signCookie({ iat: now, exp: now + 3600 }, SECRET);
    const parts = cookie.split(".");
    const tampered = `${parts[0]}.invalidsignatureXXX`;

    expect(verifyCookie(tampered, SECRET)).toBeNull();
  });

  it("returns null when the payload is tampered (signature stays original)", () => {
    const now = nowSeconds();
    const cookie = signCookie({ iat: now, exp: now + 3600 }, SECRET);
    const dotIndex = cookie.lastIndexOf(".");
    const sig = cookie.slice(dotIndex + 1);

    const fakePayload = Buffer.from(JSON.stringify({ iat: now, exp: now + 9999 })).toString(
      "base64url",
    );
    const tampered = `${fakePayload}.${sig}`;

    expect(verifyCookie(tampered, SECRET)).toBeNull();
  });

  it("returns null when verified with a different secret", () => {
    const now = nowSeconds();
    const cookie = signCookie({ iat: now, exp: now + 3600 }, SECRET);

    expect(verifyCookie(cookie, "wrong-secret")).toBeNull();
  });
});

describe("verifyCookie — structure validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty string", () => {
    expect(verifyCookie("", SECRET)).toBeNull();
  });

  it("returns null for string with no dots", () => {
    expect(verifyCookie("nodotsinhere", SECRET)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyCookie("!!!garbage!!!", SECRET)).toBeNull();
  });

  it("returns null when exp is not a number", () => {
    const now = nowSeconds();
    const payload = { iat: now, exp: "not-a-number" };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    const cookie = `${payloadB64}.${sig}`;

    expect(verifyCookie(cookie, SECRET)).toBeNull();
  });

  it("returns null when iat is not a number", () => {
    const now = nowSeconds();
    const payload = { iat: "not-a-number", exp: now + 3600 };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    const cookie = `${payloadB64}.${sig}`;

    expect(verifyCookie(cookie, SECRET)).toBeNull();
  });

  it("returns null when payload is missing iat", () => {
    const now = nowSeconds();
    const bad = { exp: now + 3600 };
    const payloadB64 = Buffer.from(JSON.stringify(bad)).toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    expect(verifyCookie(`${payloadB64}.${sig}`, SECRET)).toBeNull();
  });

  it("returns null when payload is missing exp", () => {
    const now = nowSeconds();
    const bad = { iat: now };
    const payloadB64 = Buffer.from(JSON.stringify(bad)).toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    expect(verifyCookie(`${payloadB64}.${sig}`, SECRET)).toBeNull();
  });

  it("returns null when payload is not an object", () => {
    const payloadB64 = Buffer.from(JSON.stringify("just-a-string")).toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    expect(verifyCookie(`${payloadB64}.${sig}`, SECRET)).toBeNull();
  });

  it("returns null when payload base64 decodes to invalid JSON", () => {
    const badB64 = Buffer.from("not-json{{{").toString("base64url");
    const sig = Buffer.alloc(32).toString("base64url");
    expect(verifyCookie(`${badB64}.${sig}`, SECRET)).toBeNull();
  });
});

describe("verifyCookie — expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the payload when exp is in the future (verifyCookie does not check expiry)", () => {
    const now = nowSeconds();
    const payload = { iat: now, exp: now + 3600 };
    const cookie = signCookie(payload, SECRET);
    const result = verifyCookie(cookie, SECRET);

    expect(result).not.toBeNull();
    expect(result!.exp).toBe(payload.exp);
  });

  it("still returns the payload when exp is already past — verifyCookie is a structure+sig check only", () => {
    const now = nowSeconds();
    const payload = { iat: now - 7200, exp: now - 3600 };
    const cookie = signCookie(payload, SECRET);
    const result = verifyCookie(cookie, SECRET);

    expect(result).not.toBeNull();
    expect(result!.exp).toBe(payload.exp);
  });
});
