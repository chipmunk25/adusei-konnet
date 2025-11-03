import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
  ParticipantEvent,
} from "livekit-client";
import {
  connectRoom,
  createLocalAvTracks,
  startScreenShare,
  type LocalMedia,
} from "./rtc/livekit-client";

type JoinState = "idle" | "joining" | "joined" | "error";

export function Call() {
  const [roomName, setRoomName] = useState("lobby");
  const [identity] = useState(`user-${crypto.randomUUID().slice(0, 6)}`);
  const [state, setState] = useState<JoinState>("idle");
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const localMediaRef = useRef<LocalMedia | null>(null);
  const screenRef = useRef<LocalMedia | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      try {
        screenRef.current?.cleanup();
        localMediaRef.current?.cleanup();
        roomRef.current?.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  const mountPublication = (pub: RemoteTrackPublication): void => {
    const track = pub.track;
    if (!track) return;

    if (track.kind === Track.Kind.Audio) {
      const el = track.attach();
      el.style.display = "none";
      containerRef.current?.appendChild(el);
    } else if (track.kind === Track.Kind.Video) {
      const el = track.attach();
      el.style.width = "320px";
      el.style.height = "240px";
      el.style.objectFit = "cover";
      el.className = "rounded-md border";
      containerRef.current?.appendChild(el);
    }
  };

  const wireParticipant = (p: RemoteParticipant): void => {
    // Mount anything already published
    for (const pub of p.trackPublications.values()) {
      mountPublication(pub);
    }
    // Mount future publications
    p.on(ParticipantEvent.TrackPublished, (pub: RemoteTrackPublication) => {
      mountPublication(pub);
    });
  };

  const join = async (): Promise<void> => {
    setState("joining");
    setError(null);

    try {
      const resp = await fetch("/api/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomName, identity }),
      });
      if (!resp.ok) throw new Error(`Token request failed (${resp.status})`);
      const { token, wsUrl } = (await resp.json()) as {
        token: string;
        wsUrl: string;
      };

      const room = await connectRoom({ wsUrl, token });
      roomRef.current = room;

      // Publish local camera+mic
      localMediaRef.current = await createLocalAvTracks(room);

      // Wire room-level events
      room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
        wireParticipant(p);
      });

      // Wire already-connected participants
      for (const p of room.remoteParticipants.values()) {
        wireParticipant(p);
      }

      setState("joined");
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  };

  const leave = async (): Promise<void> => {
    try {
      screenRef.current?.cleanup();
      localMediaRef.current?.cleanup();
      roomRef.current?.disconnect();
    } finally {
      screenRef.current = null;
      localMediaRef.current = null;
      roomRef.current = null;

      const el = containerRef.current;
      if (el) {
        while (el.firstChild) el.removeChild(el.firstChild);
      }
      setState("idle");
    }
  };

  const toggleScreen = async (): Promise<void> => {
    if (!roomRef.current) return;
    if (screenRef.current) {
      screenRef.current.cleanup();
      screenRef.current = null;
    } else {
      screenRef.current = await startScreenShare(roomRef.current);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Room</label>
          <input
            className="px-3 py-2 border rounded-md bg-background"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            disabled={state === "joining" || state === "joined"}
          />
        </div>
        {state !== "joined" ? (
          <button
            onClick={join}
            disabled={state === "joining"}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {state === "joining" ? "Joining..." : "Join"}
          </button>
        ) : (
          <button
            onClick={leave}
            className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground"
          >
            Leave
          </button>
        )}
        <button
          onClick={toggleScreen}
          disabled={state !== "joined"}
          className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground disabled:opacity-50"
        >
          {screenRef.current ? "Stop Share" : "Share Screen"}
        </button>
      </div>

      {error && <div className="text-sm text-destructive">Error: {error}</div>}

      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      />
    </div>
  );
}
