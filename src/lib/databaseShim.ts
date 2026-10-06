/**
 * Database Shim for Bhola UI Preview Kit.
 * Mocks all @bhola/database queries and types in-memory so UI components
 * work out of the box in Bolt.new / v0 with zero external dependencies.
 */

import { PERSONAS } from '../data/constants';

export type SubscriptionTier = 'starter' | 'pro' | 'studio' | 'enterprise';
export type AmbientFrequency = 'Mentions Only' | 'Balanced' | 'High' | 'Off' | 'Low' | 'Medium' | 'Extreme';

export interface PlanConfig {
  id: SubscriptionTier | string;
  planName: string;
  priceUsd: number;
  pricePkr: number;
  price_usd?: number;
  price_pkr?: number;
  listPricePkr?: number;
  listPriceUsd?: number;
  tokensPerMonth: number;
  dailyMessageLimit: number;
  allowedPersonas: string[];
  cooldownSeconds: number;
  maxConcurrentStreams: number;
  tagline: string;
  badge?: string;
  features: string[];
  is_public?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, PlanConfig> = {
  starter: {
    id: 'starter',
    planName: 'Starter',
    priceUsd: 0,
    pricePkr: 0,
    price_usd: 0,
    price_pkr: 0,
    listPricePkr: 699,
    listPriceUsd: 2.49,
    tokensPerMonth: 30000,
    dailyMessageLimit: 80,
    allowedPersonas: ['bandya', 'bandiya'],
    cooldownSeconds: 15,
    maxConcurrentStreams: 1,
    tagline: 'Free Starter & Test • List PKR 699 ($2.49)',
    badge: 'Default',
    is_public: true,
    features: [
      '30,000 tokens / month',
      'Daily Limit: 80 messages/day (Anti-spam protection)',
      '1 concurrent stream',
      'Bandya persona included',
      'Mentions-Only trigger mode',
      '15s cooldown response delay',
      'Max 3 audience matrix chatters',
    ],
  },
  pro: {
    id: 'pro',
    planName: 'Pro Creator',
    priceUsd: 5.49,
    pricePkr: 1499,
    price_usd: 5.49,
    price_pkr: 1499,
    tokensPerMonth: 150000,
    dailyMessageLimit: 400,
    allowedPersonas: ['bandya', 'bandiya', 'bhola'],
    cooldownSeconds: 5,
    maxConcurrentStreams: 1,
    tagline: 'Supercharge Your Stream Banter',
    badge: 'Popular',
    is_public: true,
    features: [
      '150,000 tokens / month',
      'Daily Limit: 400 messages/day (Anti-spam protection)',
      '1 concurrent stream',
      'Bandya & Bhola personas unlocked',
      'Ambient chat frequency (unprompted banter)',
      'Custom slangs & channel catchphrases',
      '5s fast cooldown response delay',
      'Unlimited audience matrix tagging',
    ],
  },
  studio: {
    id: 'studio',
    planName: 'Studio',
    priceUsd: 14.49,
    pricePkr: 3999,
    price_usd: 14.49,
    price_pkr: 3999,
    tokensPerMonth: 500000,
    dailyMessageLimit: 1500,
    allowedPersonas: ['bhola', 'baburao', 'bandya', 'bandiya'],
    cooldownSeconds: 0,
    maxConcurrentStreams: 3,
    tagline: 'For Daily Streamers & Multi-Streamers',
    badge: 'Powerhouse',
    is_public: true,
    features: [
      '500,000 tokens / month',
      'Daily Limit: 1,500 messages/day (Anti-spam protection)',
      '3 concurrent streams',
      'All 3 personas (Bandya, Bhola, Babu Rao)',
      'Priority support',
      '0s instant zero-delay live reactions',
      'Perpetual vector memory & context cache',
      'Full session history',
    ],
  },
  enterprise: {
    id: 'enterprise',
    planName: 'Enterprise',
    priceUsd: 49.99,
    pricePkr: 14999,
    price_usd: 49.99,
    price_pkr: 14999,
    tokensPerMonth: 2000000,
    dailyMessageLimit: 5000,
    allowedPersonas: ['bhola', 'baburao', 'bandya', 'bandiya'],
    cooldownSeconds: 0,
    maxConcurrentStreams: 10,
    tagline: 'Enterprise Gaming & Esport Production',
    badge: 'Enterprise',
    is_public: true,
    features: [
      '2,000,000 tokens / month',
      'Daily Limit: 5,000+ messages/day',
      '10 concurrent streams',
      'Dedicated VIP support',
      'Custom persona voice tuning',
      'All 3 personas + custom personas',
    ],
  },
};

export const DAILY_LIMITS = {
  simulator: {
    starter: 15,
    pro: 200,
    studio: 500,
    enterprise: -1,
  },
  liveStream: {
    starter: 50,
    pro: 400,
    studio: 1500,
    enterprise: -1,
  },
} as const;

export function planTierToSubscriptionTier(tier?: string | null): SubscriptionTier {
  if (!tier) return 'starter';
  const t = tier.toLowerCase();
  if (t === 'pro' || t === 'pro_creator') return 'pro';
  if (t === 'studio' || t === 'elite_studio') return 'studio';
  if (t === 'enterprise') return 'enterprise';
  return 'starter';
}

export function toCanonicalPersonaId(personaId?: string | null): string {
  if (!personaId) return 'bandya';
  const p = personaId.toLowerCase().trim();
  if (p === 'bandiya' || p === 'bandya') return 'bandya';
  if (p === 'bhola') return 'bhola';
  if (p === 'baburao' || p === 'babu-rao') return 'baburao';
  return p;
}

export function getCanonicalHandle(personaId?: string | null): string {
  const c = toCanonicalPersonaId(personaId);
  if (c === 'bandya') return '@bandya-hoon';
  if (c === 'bhola') return '@bhola-hoon';
  if (c === 'baburao') return '@baburao-hoon';
  return `@${c}-hoon`;
}

export function getRequiredTierForPersona(personaId: string | any): SubscriptionTier {
  const rawId = typeof personaId === 'string' ? personaId : personaId?.persona_id || personaId?.id || '';
  const id = rawId.toLowerCase();
  if (id === 'bandiya' || id === 'bandya') return 'starter';
  if (id === 'bhola') return 'pro';
  if (id === 'baburao' || id === 'babu-rao') return 'studio';
  return 'studio';
}

export function isPersonaUnlockedForTier(personaId: string | any, currentTier: SubscriptionTier): boolean {
  const normalizedTier = planTierToSubscriptionTier(currentTier);
  const requiredTier = getRequiredTierForPersona(personaId);
  const tierWeights: Record<SubscriptionTier, number> = {
    starter: 1,
    pro: 2,
    studio: 3,
    enterprise: 4,
  };
  return (tierWeights[normalizedTier] || 1) >= (tierWeights[requiredTier] || 1);
}

export function isPersonaPublic(personaId: string | any): boolean {
  return true;
}

export function calculateResetFormatted(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = midnight.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

export interface AudienceRole {
  id: string;
  label: string;
  description?: string | null;
  default_sentiment: string;
  color?: string;
  icon?: string;
  is_system?: boolean;
  is_active?: boolean;
}

export const MOCK_AUDIENCE_ROLES: AudienceRole[] = [
  { id: 'streamer', label: 'Host / Streamer', default_sentiment: 'Boss / Partner', color: 'text-amber-400', icon: 'Crown' },
  { id: 'vip_superchatter', label: 'VIP Superchatter', default_sentiment: 'Respectful Hype', color: 'text-purple-400', icon: 'Crown' },
  { id: 'troll', label: 'Toxic Troll', default_sentiment: 'Savage Counter-Roast', color: 'text-red-400', icon: 'Flame' },
  { id: 'mod_male', label: 'Mod (Bhai)', default_sentiment: 'Brotherly banter', color: 'text-blue-400', icon: 'Shield' },
  { id: 'mod_female', label: 'Mod (Baji)', default_sentiment: 'Playful Respect', color: 'text-pink-400', icon: 'ShieldCheck' },
  { id: 'female_viewer', label: 'Female Viewer', default_sentiment: 'Flirtatious Comic Wit', color: 'text-rose-400', icon: 'Heart' },
  { id: 'regular_buddy', label: 'Regular Buddy', default_sentiment: 'Chummy Stage Wit', color: 'text-emerald-400', icon: 'Zap' },
  { id: 'general_viewer', label: 'General Viewer', default_sentiment: 'Casual Desi Comedy', color: 'text-zinc-400', icon: 'User' },
];

export async function fetchAudienceRoles(includeInactive = false): Promise<AudienceRole[]> {
  return MOCK_AUDIENCE_ROLES;
}

export function normalizeAudienceRoleId(role: string, fallback?: string): string {
  return (role || fallback || 'regular_buddy').toLowerCase();
}

export function getPersonaQuotaExhaustionMessage(personaId: string, tier?: string): string {
  const p = toCanonicalPersonaId(personaId);
  if (p === 'bhola') {
    return 'Bhai ka quota khatam ho gaya aaj ke liye — kal milte hain 🌚! Upgrade to Pro for 400 daily replies.';
  }
  if (p === 'baburao') {
    return 'Paisa khatam, tamasha khatam re baba! Upgrade to Pro karo superfast replies ke liye!';
  }
  return 'Bandya is off duty for today — main thakk gaya 😤, maalik! Upgrade to Pro for 400 daily replies + Bhola unlocked.';
}

export interface ActiveBotPersona {
  id: string;
  persona_id: string;
  name: string;
  persona_name?: string;
  bot_name?: string;
  handle: string;
  channel_id?: string | null;
  channel_title?: string | null;
  avatar_url?: string | null;
  tagline?: string;
  traits?: string[];
  sample_dialogues?: string[];
  signature_slangs?: string[];
  specialty_tags?: string[];
  is_active?: boolean;
}

export async function fetchActiveBotPersonas(): Promise<ActiveBotPersona[]> {
  return PERSONAS.map((p) => ({
    id: p.id,
    persona_id: p.id,
    name: p.name,
    persona_name: p.name,
    bot_name: p.name,
    handle: p.handle || getCanonicalHandle(p.id),
    channel_id: `UC_bot_${p.id}`,
    channel_title: `${p.name} Official`,
    avatar_url: p.avatar_url || null,
    tagline: p.tagline,
    traits: p.specialtyTags,
    sample_dialogues: p.sampleDialogues,
    signature_slangs: ['Chhapri', 'scene on hai', 'maalik'],
    specialty_tags: p.specialtyTags,
    is_active: true,
  }));
}

export async function fetchPlans(): Promise<PlanConfig[]> {
  return Object.values(SUBSCRIPTION_PLANS);
}

export function planRowToPlanConfig(row: any): PlanConfig {
  return row as PlanConfig;
}

export interface YouTubeChannelItem {
  id: string;
  title: string;
  customUrl?: string;
  thumbnails?: any;
  subscriberCount?: string;
  videoCount?: string;
}

export interface TenantRow {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_handle?: string | null;
  avatar_url?: string | null;
  subscription_tier: SubscriptionTier;
  active_bot_id?: string | null;
  onboarding_completed: boolean;
  tokens_used_this_month: number;
  messages_sent_today: number;
  gender?: 'male' | 'female';
  name?: string;
  handle?: string;
  avatar_initial?: string;
  email?: string;
  is_live?: boolean;
  is_moderator_verified?: boolean;
  pending_live_verification?: boolean;
}

export async function fetchSystemSettings(): Promise<any> {
  return {
    gemini_model: 'gemini-3.8-flash',
    default_cooldown: 5,
    persona_hub_announcement: null,
    moderator_guide_video_url: null,
  };
}

export async function updateTenant(tenantId: string, updates: Partial<TenantRow>): Promise<TenantRow> {
  return {
    id: tenantId,
    channel_id: 'UC_mock_streamer_01',
    channel_title: 'Ali Gaming',
    channel_handle: '@aligaming_live',
    avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    subscription_tier: 'pro',
    active_bot_id: 'bandya',
    onboarding_completed: true,
    tokens_used_this_month: 42500,
    messages_sent_today: 148,
    gender: 'male',
    name: 'Ali Gaming',
    handle: '@aligaming_live',
    avatar_initial: 'A',
    email: 'ali@gaming.pk',
    is_live: true,
    is_moderator_verified: true,
    pending_live_verification: false,
    ...updates,
  };
}

export async function saveBotConfig(tenantId: string, config: any): Promise<boolean> {
  return true;
}

export async function fetchBotConfig(tenantId: string): Promise<any> {
  return {
    roast_intensity: 7,
    ambient_frequency: 'Balanced',
    custom_slangs: ['Chhapri', '🌚', 'scene on hai', 'Chal bay', 'OP bolte'],
    active_persona_id: 'bandya',
  };
}

export async function fetchMaintenanceStatus(): Promise<{ maintenance: boolean; notice: string | null }> {
  return { maintenance: false, notice: null };
}

export function isSupabaseConfigured(): boolean {
  return true;
}

export function getSupabaseClient(): any {
  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
    }),
  };
}

export function getSupabaseAdminClient(): any {
  return getSupabaseClient();
}
