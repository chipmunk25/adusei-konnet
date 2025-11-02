import { useEffect, useRef } from "react";
import type { SignalMessage, ServerMessage } from "@/server/types"; // adapt path

export function useSignaling(wsUrl: string) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data) as ServerMessage;
      // dispatch to app-specific handlers
      console.debug("recv", msg);
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  function send(msg: SignalMessage): void {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    ws.send(JSON.stringify(msg));
  }

  return { send, ws: wsRef };
}
