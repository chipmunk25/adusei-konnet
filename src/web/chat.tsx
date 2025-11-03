import { useEffect, useMemo, useRef, useState } from "react";
import type { ParticipantInfo, ServerMessage } from "../server/types";

type ConnState = "disconnected" | "connecting" | "connected";

function wsURL() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

export function Chat() {
  const [connState, setConnState] = useState<ConnState>("disconnected");
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("lobby");
  const [username] = useState(() => `you-${crypto.randomUUID().slice(0, 6)}`);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  const statusColor = useMemo(() => {
    switch (connState) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500";
      default:
        return "bg-red-500";
    }
  }, [connState]);

  // Append a log line with a timestamp
  const log = (line: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${ts}] ${line}`, ...prev].slice(0, 200));
  };

  useEffect(() => {
    setConnState("connecting");
    const ws = new WebSocket(wsURL());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("connected");
      log("WebSocket connected");
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ServerMessage;
        switch (msg.type) {
          case "joined": {
            setParticipants(msg.participants);
            log(
              `Joined room "${msg.roomId}" with ${msg.participants.length} other participant(s)`
            );
            setJoined(true);
            break;
          }
          case "participant-joined": {
            setParticipants((prev) => {
              if (prev.some((p) => p.id === msg.participant.id)) return prev;
              return [...prev, msg.participant];
            });
            log(
              `Participant joined: ${msg.participant.username} (${msg.participant.id})`
            );
            break;
          }
          case "participant-left": {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== msg.participantId)
            );
            log(`Participant left: ${msg.participantId}`);
            break;
          }
          case "offer":
          case "answer":
            log(`${msg.type} received from ${msg.from}`);
            break;
          case "ice":
            log(`ICE candidate received from ${msg.from}`);
            break;
          default:
            log(`Unknown message: ${ev.data}`);
        }
      } catch (e) {
        log(`Message parse error: ${String(e)}`);
      }
    };

    ws.onclose = () => {
      setConnState("disconnected");
      setJoined(false);
      setParticipants([]);
      log("WebSocket disconnected");
    };

    ws.onerror = () => {
      log("WebSocket error");
    };

    return () => {
      try {
        ws.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    };
  }, []);

  const send = (payload: unknown) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log("WebSocket is not open");
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const handleJoin = () => {
    if (!roomId.trim()) {
      log("Please enter a room id");
      return;
    }
    send({ type: "join", roomId });
  };

  const handleLeave = () => {
    send({ type: "leave" });
    setJoined(false);
    setParticipants([]);
    log(`Left room "${roomId}"`);
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${statusColor}`} />
        <span className="text-sm">
          {connState === "connected"
            ? "Connected"
            : connState === "connecting"
            ? "Connecting..."
            : "Disconnected"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label htmlFor="roomId" className="text-sm text-muted-foreground">
            Room ID
          </label>
          <input
            id="roomId"
            className="px-3 py-2 border rounded-md bg-background"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="room id (e.g., lobby)"
            disabled={joined}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground">Username</label>
          <input
            className="px-3 py-2 border rounded-md bg-muted/50"
            value={username}
            readOnly
          />
        </div>

        {!joined ? (
          <button
            onClick={handleJoin}
            disabled={connState !== "connected"}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            Join
          </button>
        ) : (
          <button
            onClick={handleLeave}
            className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground"
          >
            Leave
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">
            Participants ({participants.length})
          </h3>
          <ul className="space-y-2">
            {participants.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No other participants
              </li>
            )}
            {participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <span className="font-mono text-xs">{p.id}</span>
                <span className="font-medium">{p.username}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Logs</h3>
          <div className="h-48 overflow-auto border rounded-md p-2 bg-background text-sm font-mono">
            {logs.map((l, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        This UI sends "join" and "leave" messages to {`/ws`} and shows
        participant updates from "joined", "participant-joined", and
        "participant-left".
      </p>
    </div>
  );
}
