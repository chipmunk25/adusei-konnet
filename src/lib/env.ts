export type Env = {
  PORT: number;
  LIVEKIT_API_KEY: string;
  LIVEKIT_API_SECRET: string;
  LIVEKIT_WS_URL: string;
  DATABASE_URL: string;
};

function required<K extends keyof Env>(name: K, v: string | undefined): string {
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${String(name)}`);
  }
  return v;
}

export const env: Env = {
  PORT: Number(process.env.PORT ?? 3000),
  LIVEKIT_API_KEY: required("LIVEKIT_API_KEY", process.env.LIVEKIT_API_KEY),
  LIVEKIT_API_SECRET: required(
    "LIVEKIT_API_SECRET",
    process.env.LIVEKIT_API_SECRET
  ),
  LIVEKIT_WS_URL: required("LIVEKIT_WS_URL", process.env.LIVEKIT_WS_URL),
  DATABASE_URL: required("DATABASE_URL", process.env.DATABASE_URL),
};
