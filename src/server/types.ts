export type UUID = string;

export interface ParticipantInfo {
  id: string;
  username: string;
}

export type SignalMessage =
  | { type: "join"; roomId: string; token?: string }
  | { type: "leave" }
  | { type: "offer"; sdp: string; to?: string }
  | { type: "answer"; sdp: string; to?: string }
  | {
      type: "ice";
      candidate: string;
      sdpMid?: string;
      sdpMLineIndex?: number;
      to?: string;
    };

export type ServerMessage =
  | { type: "joined"; roomId: string; participants: ParticipantInfo[] }
  | { type: "participant-joined"; participant: ParticipantInfo }
  | { type: "participant-left"; participantId: string }
  | { type: "offer"; from: string; sdp: string }
  | { type: "answer"; from: string; sdp: string }
  | {
      type: "ice";
      from: string;
      candidate: string;
      sdpMid?: string;
      sdpMLineIndex?: number;
    };
