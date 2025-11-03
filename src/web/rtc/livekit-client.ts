import {
  Room,
  RoomEvent,
  createLocalTracks,
  createLocalScreenTracks,
  Track,
  type LocalTrack,
} from "livekit-client";

// Derive the connect options type from the Room.connect signature
type LKConnectOptions = NonNullable<Parameters<Room["connect"]>[2]>;

export type JoinOptions = {
  wsUrl: string;
  token: string;
};

export type LocalMedia = {
  cleanup(): void;
};

export async function connectRoom({
  wsUrl,
  token,
}: JoinOptions): Promise<Room> {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  room.on(RoomEvent.ParticipantConnected, (p) => {
    // eslint-disable-next-line no-console
    console.log("ParticipantConnected", p.identity);
  });
  room.on(RoomEvent.ParticipantDisconnected, (p) => {
    // eslint-disable-next-line no-console
    console.log("ParticipantDisconnected", p.identity);
  });

  const connectOpts: LKConnectOptions = {
    autoSubscribe: true,
  };

  await room.connect(wsUrl, token, connectOpts);
  return room;
}

/**
 * Create and publish local microphone + camera tracks.
 */
export async function createLocalAvTracks(room: Room): Promise<LocalMedia> {
  const tracks = await createLocalTracks({
    audio: true,
    video: { facingMode: "user" },
  });

  for (const t of tracks) {
    await room.localParticipant.publishTrack(t);
  }

  return {
    cleanup(): void {
      for (const t of tracks) t.stop();
    },
  };
}

/**
 * Start screen sharing (video and optionally system audio) and publish tracks.
 */
export async function startScreenShare(room: Room): Promise<LocalMedia> {
  const tracks: LocalTrack[] = await createLocalScreenTracks({
    video: true,
    audio: true,
  });

  for (const t of tracks) {
    const source =
      t.kind === Track.Kind.Audio
        ? Track.Source.ScreenShareAudio
        : Track.Source.ScreenShare;
    await room.localParticipant.publishTrack(t, { source });
  }

  return {
    cleanup(): void {
      for (const t of tracks) t.stop();
    },
  };
}
