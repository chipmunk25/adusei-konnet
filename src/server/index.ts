import { serve } from "bun";

import type { SignalMessage, ServerMessage, ParticipantInfo } from "./types";

type ClientRecord = {
  id: string;
  username: string;
  ws: WebSocket;
  roomId?: string;
};

const clients = new Map<string, ClientRecord>();

function parseSignalMessage(raw: string): SignalMessage | null {
  try {
    const parsed = JSON.parse(raw) as SignalMessage;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as { type?: unknown }).type !== "string"
    ) {
      return null;
    }
    switch (parsed.type) {
      case "join":
        return typeof parsed.roomId === "string" ? parsed : null;
      case "leave":
        return parsed;
      case "offer":
      case "answer":
        return typeof parsed.sdp === "string" ? parsed : null;
      case "ice":
        return typeof parsed.candidate === "string" ? parsed : null;
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function broadcastToRoom(
  roomId: string,
  message: ServerMessage,
  exceptClientId?: string
): void {
  for (const client of clients.values()) {
    if (client.roomId === roomId && client.id !== exceptClientId) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      // NOTE: call the top-level `upgradeWebSocket`, not `Bun.upgradeWebSocket`
      // @ts-ignore
      const { socket, response } = Bun.upgradeWebSocket(request);
      const id = crypto.randomUUID();
      const client: ClientRecord = {
        id,
        username: `user-${id.slice(0, 6)}`,
        ws: socket,
      };
      clients.set(id, client);

      socket.onopen = () => {
        // optional welcome
      };

      socket.onmessage = (ev: { data: string }) => {
        const msg = parseSignalMessage(ev.data);
        if (!msg) return;

        switch (msg.type) {
          case "join": {
            client.roomId = msg.roomId;
            const participant: ParticipantInfo = {
              id,
              username: client.username,
            };
            const joinedMsg: ServerMessage = {
              type: "participant-joined",
              participant,
            };
            broadcastToRoom(msg.roomId, joinedMsg, client.id);

            const participants: ParticipantInfo[] = [];
            for (const other of clients.values()) {
              if (other.roomId === msg.roomId && other.id !== client.id) {
                participants.push({ id: other.id, username: other.username });
              }
            }
            const ack: ServerMessage = {
              type: "joined",
              roomId: msg.roomId,
              participants,
            };
            client.ws.send(JSON.stringify(ack));
            break;
          }
          case "leave": {
            if (client.roomId) {
              const left: ServerMessage = {
                type: "participant-left",
                participantId: client.id,
              };
              broadcastToRoom(client.roomId, left, client.id);
              client.roomId = undefined;
            }
            break;
          }
          case "offer": {
            if (!client.roomId) return;
            const forwarded: ServerMessage = {
              type: "offer",
              from: client.id,
              sdp: msg.sdp,
            };
            broadcastToRoom(client.roomId, forwarded, client.id);
            break;
          }
          case "answer": {
            if (!client.roomId) return;
            const forwarded: ServerMessage = {
              type: "answer",
              from: client.id,
              sdp: msg.sdp,
            };
            broadcastToRoom(client.roomId, forwarded, client.id);
            break;
          }
          case "ice": {
            if (!client.roomId) return;
            const forwarded: ServerMessage = {
              type: "ice",
              from: client.id,
              candidate: msg.candidate,
              sdpMid: msg.sdpMid,
              sdpMLineIndex: msg.sdpMLineIndex,
            };
            broadcastToRoom(client.roomId, forwarded, client.id);
            break;
          }
        }
      };

      socket.onclose = () => {
        if (client.roomId) {
          const left: ServerMessage = {
            type: "participant-left",
            participantId: client.id,
          };
          broadcastToRoom(client.roomId, left, client.id);
        }
        clients.delete(client.id);
      };

      return response;
    }

    // other routes / static serving...
    return new Response("Not Found", { status: 404 });
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});
