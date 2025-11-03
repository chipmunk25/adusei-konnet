import { serve, type ServerWebSocket } from "bun";
import index from "../web/index.html";

import type { SignalMessage, ServerMessage, ParticipantInfo } from "./types";

import { createJoinToken, type CreateTokenRequest } from "./livekit";
import { env } from "@/lib/env";
type ClientData = {
  id: string;
  username: string;
  roomId?: string;
};

const clients = new Map<string, ServerWebSocket<ClientData>>();

function parseSignalMessage(
  raw: string | ArrayBuffer | Buffer<ArrayBuffer>
): SignalMessage | null {
  try {
    const str =
      typeof raw === "string"
        ? raw
        : raw instanceof Buffer
        ? new TextDecoder().decode(raw.buffer)
        : new TextDecoder().decode(raw);
    const parsed = JSON.parse(str) as SignalMessage;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as any).type !== "string"
    ) {
      return null;
    }
    switch (parsed.type) {
      case "join":
        return typeof (parsed as any).roomId === "string" ? parsed : null;
      case "leave":
        return parsed;
      case "offer":
      case "answer":
        return typeof (parsed as any).sdp === "string" ? parsed : null;
      case "ice":
        return typeof (parsed as any).candidate === "string" ? parsed : null;
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
  for (const [id, ws] of clients) {
    if (ws.data.roomId === roomId && id !== exceptClientId) {
      ws.send(JSON.stringify(message));
    }
  }
}

const server = serve<ClientData>({
  port: env.PORT,

  routes: {
    "/": index,
    "/index.html": index,
  },

  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const id = crypto.randomUUID();
      const ok = server.upgrade(req, {
        data: { id, username: `user-${id.slice(0, 6)}` },
      });
      if (ok) return;
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    if (url.pathname === "/api/token" && req.method === "POST") {
      const body = (await req.json()) as Partial<CreateTokenRequest>;
      const roomName = (body.roomName ?? "").toString();
      const identity = (body.identity ?? "").toString();

      if (!roomName || !identity) {
        return new Response(
          JSON.stringify({ error: "roomName and identity are required" }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          }
        );
      }

      const token = createJoinToken({
        roomName,
        identity,
        name: body.name?.toString(),
      });
      return new Response(JSON.stringify(token), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      const { id } = ws.data;
      clients.set(id, ws);
    },

    message(ws, raw) {
      const msg = parseSignalMessage(raw instanceof Buffer ? raw.buffer : raw);
      if (!msg) return;
      const self = ws.data;

      switch (msg.type) {
        case "join": {
          self.roomId = msg.roomId;
          const participant: ParticipantInfo = {
            id: self.id,
            username: self.username,
          };
          broadcastToRoom(
            msg.roomId,
            { type: "participant-joined", participant },
            self.id
          );

          const participants: ParticipantInfo[] = [];
          for (const other of clients.values()) {
            if (other.data.roomId === msg.roomId && other.data.id !== self.id) {
              participants.push({
                id: other.data.id,
                username: other.data.username,
              });
            }
          }
          ws.send(
            JSON.stringify({
              type: "joined",
              roomId: msg.roomId,
              participants,
            } satisfies ServerMessage)
          );
          break;
        }

        case "leave": {
          if (self.roomId) {
            broadcastToRoom(
              self.roomId,
              { type: "participant-left", participantId: self.id },
              self.id
            );
            self.roomId = undefined;
          }
          break;
        }

        case "offer": {
          if (!self.roomId) return;
          broadcastToRoom(
            self.roomId,
            { type: "offer", from: self.id, sdp: msg.sdp },
            self.id
          );
          break;
        }

        case "answer": {
          if (!self.roomId) return;
          broadcastToRoom(
            self.roomId,
            { type: "answer", from: self.id, sdp: msg.sdp },
            self.id
          );
          break;
        }

        case "ice": {
          if (!self.roomId) return;
          broadcastToRoom(
            self.roomId,
            {
              type: "ice",
              from: self.id,
              candidate: msg.candidate,
              sdpMid: msg.sdpMid,
              sdpMLineIndex: msg.sdpMLineIndex,
            },
            self.id
          );
          break;
        }
      }
    },

    close(ws) {
      const { id, roomId } = ws.data;
      if (roomId) {
        broadcastToRoom(
          roomId,
          { type: "participant-left", participantId: id },
          id
        );
      }
      clients.delete(id);
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
