export type UserStatus = 'available' | 'calling' | 'ringing' | 'in_call';

export interface User {
  id: string;
  name: string;
  status: UserStatus;
  avatarColor: string;
  joinedAt?: number;
}

export type CallStatus =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'ended';

export interface ActiveCall {
  partner: User;
  status: CallStatus;
  startTime?: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isDeafened?: boolean;
}

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export type WebSocketMessage =
  | { type: 'register'; name: string; avatarColor?: string }
  | { type: 'registered'; id: string; users: User[] }
  | { type: 'users_updated'; users: User[] }
  | { type: 'call_user'; targetId: string }
  | { type: 'incoming_call'; fromId: string; fromName: string; fromAvatarColor: string }
  | { type: 'accept_call'; callerId: string }
  | { type: 'call_accepted'; partnerId: string; partnerName: string; partnerAvatarColor: string }
  | { type: 'call_started'; partnerId: string; partnerName: string; partnerAvatarColor: string }
  | { type: 'reject_call'; callerId: string; reason?: string }
  | { type: 'call_rejected'; reason: string }
  | { type: 'cancel_call' }
  | { type: 'end_call'; partnerId?: string }
  | { type: 'call_ended'; reason?: string }
  | { type: 'signal'; targetId: string; signal: SignalData }
  | { type: 'ping' }
  | { type: 'pong' };
