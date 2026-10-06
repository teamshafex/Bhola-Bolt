export type PersonaId = 'bhola' | 'baburao' | 'bandya' | 'bandiya';

export interface Persona {
  id: PersonaId | string;
  name: string;
  handle?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  avatarEmoji?: string;
  tagline: string;
  sampleDialogues: string[];
  specialtyTags: string[];
}

export type StreamStatus = 'live' | 'premiere' | 'offline';

export type ChatterRole =
  | 'streamer'
  | 'mod_male'
  | 'mod_female'
  | 'vip_superchatter'
  | 'troll'
  | 'female_viewer'
  | 'regular_buddy'
  | 'general_viewer'
  | 'moderator'
  | 'female'
  | 'vip'
  | 'regular'
  | 'mod'
  | (string & {});

export interface Chatter {
  id: string;
  name: string;
  handle: string;
  role: ChatterRole;
  notes?: string;
  lastSeen: string;
  avatarBg?: string;
  isRoleLocked?: boolean;
  autoIngested?: boolean;
}

export interface FeedMessage {
  id: string;
  timestamp: string;
  chatterName: string;
  role: ChatterRole;
  text: string;
  isSimulated?: boolean;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export type BroadcastSessionStatus = 'active' | 'completed' | 'interrupted' | (string & {});

export interface BroadcastSession {
  id: string;
  title?: string;
  streamTitle?: string;
  dateTime: string;
  duration: string;
  durationSeconds?: number;
  messagesSent: number;
  userChatsCount?: number;
  totalUserChats?: number;
  tokensUsed: number;
  sessionCost: number;
  personaUsed: string;
  streamType?: 'live' | 'premiere' | string;
  status?: BroadcastSessionStatus;
  createdAt?: string;
}

export type SessionData = BroadcastSession;

export type NavTab = 'dashboard' | 'personas' | 'audience' | 'history' | 'pricing' | 'settings';
