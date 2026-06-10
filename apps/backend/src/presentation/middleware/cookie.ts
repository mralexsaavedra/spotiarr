import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "spotiarr_session";

function toBase64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export interface SessionPayload {
  iat: number;
  exp: number;
}

export function signCookie(payload: SessionPayload, secret: string): string {
  const payloadB64 = toBase64url(JSON.stringify(payload));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyCookie(value: string, secret: string): SessionPayload | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const payloadB64 = value.slice(0, dotIndex);
  const sig = value.slice(dotIndex + 1);

  const expectedSig = sign(payloadB64, secret);

  const sigBuf = Buffer.from(sig, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");

  if (sigBuf.length !== expectedBuf.length) return null;

  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(fromBase64url(payloadB64)) as unknown;
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("iat" in payload) ||
      !("exp" in payload) ||
      typeof (payload as Record<string, unknown>).exp !== "number" ||
      typeof (payload as Record<string, unknown>).iat !== "number"
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
