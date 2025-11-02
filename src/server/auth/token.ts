import jwt from 'jsonwebtoken';

const JWT_ALG = 'HS256';
const JWT_EXPIRES_SECONDS = 60 * 15; // 15 minutes

export interface LiveKitTokenPayload {
  sub: string; // user id
  roomId: string;
  iat?: number;
  exp?: number;
}

export function signLiveKitToken(secret: string, payload: LiveKitTokenPayload): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      ...payload,
      iat: issuedAt,
      exp: issuedAt + JWT_EXPIRES_SECONDS
    },
    secret,
    { algorithm: JWT_ALG }
  );
  return token;
}

export function verifyToken<T extends Record<string, unknown>>(secret: string, token: string): T {
  // throws if invalid
  return jwt.verify(token, secret) as T;
}