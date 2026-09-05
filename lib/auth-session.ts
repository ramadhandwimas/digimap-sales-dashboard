import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "m238_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  nik: string;
  name: string;
  exp: number;
};

function secret() {
  return (
    process.env.DASHBOARD_AUTH_SECRET ||
    process.env.GOOGLE_PRIVATE_KEY ||
    "m238-dashboard-development-session"
  );
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionToken(nik: string, name: string) {
  const payload: SessionPayload = {
      nik,
      name,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    },
    encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = signature(encoded),
    left = Buffer.from(supplied),
    right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.nik || !payload.name || payload.exp <= Date.now() / 1000)
      return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
