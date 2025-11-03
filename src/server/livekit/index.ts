import { AccessToken, TrackSource } from "livekit-server-sdk";
import { env } from "@/lib/env";

export type CreateTokenRequest = {
  roomName: string;
  identity: string;
  name?: string;
};

export type CreateTokenResponse = {
  token: string;
  wsUrl: string;
};

export function createJoinToken(req: CreateTokenRequest): CreateTokenResponse {
  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: req.identity,
    name: req.name ?? req.identity,
  });

  at.addGrant({
    room: req.roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: true,
    canPublishSources: [
      TrackSource.MICROPHONE,
      TrackSource.CAMERA,
      TrackSource.SCREEN_SHARE,
      TrackSource.SCREEN_SHARE_AUDIO,
    ],
  });

  const token = at.toJwt(); // string
  return { token, wsUrl: env.LIVEKIT_WS_URL };
}
