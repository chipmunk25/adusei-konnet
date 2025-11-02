import { useEffect, useRef } from "react";

export function useLocalMedia() {
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function start(
    constraints: MediaStreamConstraints = { audio: true, video: true }
  ): Promise<MediaStream> {
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = s;
    return s;
  }

  function stop(): void {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  return {
    get stream() {
      return streamRef.current;
    },
    start,
    stop,
  } as const;
}
