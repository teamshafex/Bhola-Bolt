import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Bot,
  CheckCircle2,
  Lock,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Flame,
  Radio,
  Loader2,
  AlertCircle,
  Zap,
  Wrench,
  X,
  Info,
} from 'lucide-react';
import {
  fetchActiveBotPersonas,
  fetchSystemSettings,
  ActiveBotPersona,
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  getRequiredTierForPersona,
  isPersonaUnlockedForTier,
  isPersonaPublic,
  TenantRow,
  getSupabaseClient,
  isSupabaseConfigured,
} from '@bhola/database';
import { Persona } from '../../types';
import { StreamStatus } from '../../types';

interface PersonaHubPageProps {
  activePersona: Persona;
  onSwitchPersona: (bot: ActiveBotPersona) => Promise<void>;
  subscriptionTier?: SubscriptionTier;
  onOpenPricing?: () => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
  streamStatus?: StreamStatus;
  tenant?: TenantRow | null;
}

export const PersonaHubPage: React.FC<PersonaHubPageProps> = ({
  activePersona,
  onSwitchPersona,
  subscriptionTier = 'starter',
  onOpenPricing,
  showToast,
  streamStatus,
  tenant,
}) => {
  const [bots, setBots] = useState<ActiveBotPersona[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [switchingBotId, setSwitchingBotId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const loadBots = async () => {
    setLoading(true);
    try {
      const data = await fetchActiveBotPersonas();
      setBots(data);
    } catch (err: any) {
      console.warn('[PersonaHubPage] Failed to fetch active bot personas:', err);
      showToast('error', 'Unable to load bot personas from server.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const sysSettings = await fetchSystemSettings();
      const text = (sysSettings?.persona_hub_announcement || '').trim();
      setAnnouncement(text);
      if (typeof window !== 'undefined') {
        const dismissed = sessionStorage.getItem('bhola_dismissed_persona_announcement');
        if (dismissed && dismissed === text) {
          setIsDismissed(true);
        } else {
          setIsDismissed(false);
        }
      }
    } catch (err) {
      console.warn('[PersonaHubPage] Failed to fetch system settings announcement:', err);
    }
  };

  const handleDismissAnnouncement = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined' && announcement) {
      try {
        sessionStorage.setItem('bhola_dismissed_persona_announcement', announcement);
      } catch {}
    }
  };

  useEffect(() => {
    loadBots();
    loadSettings();

    // Re-sync whenever the window regains focus (e.g. returning from Admin tab)
    const handleFocus = () => {
      loadBots();
      loadSettings();
    };
    window.addEventListener('focus', handleFocus);

    // Listen for cross-tab storage changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bhola_personas_registry' || e.key === 'bhola_bot_accounts_registry') {
        loadBots();
      }
      if (e.key === 'bhola_system_settings') {
        loadSettings();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for custom update events (fired when Admin saves persona or settings)
    const handleCustomUpdate = () => {
      loadBots();
    };
    window.addEventListener('bhola:personas-updated', handleCustomUpdate);

    const handleSettingsUpdate = () => {
      loadSettings();
    };
    window.addEventListener('bhola:system-settings-updated', handleSettingsUpdate);

    // Supabase Realtime channel for live multi-tenant updates
    const client = getSupabaseClient();
    let channel: any = null;
    if (client && isSupabaseConfigured()) {
      try {
        channel = client
          .channel('public:personas:hub')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'personas' },
            () => {
              console.log('[PersonaHubPage] Live Supabase persona update detected, refreshing showroom...');
              loadBots();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'bot_accounts' },
            () => {
              console.log('[PersonaHubPage] Live Supabase bot account update detected, refreshing showroom...');
              loadBots();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'system_settings' },
            () => {
              console.log('[PersonaHubPage] Live Supabase system settings update detected, refreshing broadcast...');
              loadSettings();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[PersonaHubPage] Realtime subscription error:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('bhola:personas-updated', handleCustomUpdate);
      window.removeEventListener('bhola:system-settings-updated', handleSettingsUpdate);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);


  const handleSelect = async (bot: ActiveBotPersona) => {
    const isBandya =
      (bot.id || '').toLowerCase().includes('band') ||
      (bot.persona_name || bot.name || '').toLowerCase().includes('band');
    const displayName = isBandya ? 'Bandya' : bot.persona_name || bot.name || 'AI Co-Host';

    const isStarter = !subscriptionTier || subscriptionTier === 'starter';
    const isUnlocked = isStarter ? isBandya : isPersonaUnlockedForTier(bot.id, (subscriptionTier as SubscriptionTier) || 'starter');

    // Check if already active
    const isCurrent =
      isUnlocked &&
      (activePersona.id === bot.id ||
        (isBandya &&
          ((activePersona.id || '').toLowerCase().includes('band') ||
            (activePersona.name || '').toLowerCase().includes('band'))) ||
        activePersona.name.toLowerCase() === displayName.toLowerCase());
    if (isCurrent) return;

    // TIER LOCK TAKES PRIORITY: Plan-locked bots always open the Pricing Modal regardless of stream status.
    if (!isUnlocked) {
      const reqTier = getRequiredTierForPersona(bot.id);
      const reqName =
        reqTier === 'pro'
          ? 'Pro'
          : reqTier === 'studio'
          ? 'Studio'
          : SUBSCRIPTION_PLANS[reqTier]?.planName || 'Higher';
      showToast('info', `${displayName} is unlocked on ${reqName} tier!`);
      if (onOpenPricing) onOpenPricing();
      return;
    }

    // LIVE-STREAM LOCK: Tier-unlocked personas are blocked while live or during a premiere.
    if (isStreamActive) {
      showToast(
        'error',
        'Co-host persona is locked while live. Please end your stream or premiere in YouTube Studio to switch.'
      );
      return;
    }

    setSwitchingBotId(bot.id);
    try {
      await onSwitchPersona(bot);
    } finally {
      setSwitchingBotId(null);
    }
  };

  const getPersonaOrder = (id: string = '') => {
    const clean = id.toLowerCase();
    if (clean.includes('band')) return 1; // 1st: Bandya
    if (clean.includes('bhola')) return 2; // 2nd: Bhola
    if (clean.includes('babu')) return 3;  // 3rd: BabuRao
    return 4;
  };

  // Streamers must ONLY see active/public personas (is_active === true). Draft personas must stay hidden.
  const availableBots = bots.filter((bot) => {
    const isPublic = isPersonaPublic(bot);
    const isDraft =
      (bot.status || '').trim().toLowerCase() === 'draft' ||
      (bot as any).is_public === false ||
      (bot as any).is_draft === true;
    const isActive = bot.is_active === true && (bot as any).status !== 'Inactive';
    return isPublic && !isDraft && isActive;
  });

  const displayPersonas = [...availableBots].sort((a, b) => {
    return (
      getPersonaOrder(a.id || (a as any).persona_id) -
      getPersonaOrder(b.id || (b as any).persona_id)
    );
  });

  const activeCount = displayPersonas.length;

  // Responsive dynamic showroom auto-centering based on activeCount:
  // - 1 Bot: max-w-md mx-auto grid grid-cols-1 justify-center
  // - 2 Bots: max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 justify-center gap-6
  // - 3 Bots: max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
  // - 4+ Bots: max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
  const getGridContainerClass = (count: number) => {
    if (count === 1) {
      return 'w-full max-w-md mx-auto grid grid-cols-1 justify-center gap-6';
    }
    if (count === 2) {
      return 'w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 justify-center gap-6';
    }
    if (count === 3) {
      return 'w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
    return 'w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
  };

  // Derived: true when a live broadcast or premiere is active — locks co-host switching
  const isStreamActive = Boolean(
    streamStatus === 'live' || streamStatus === 'premiere' || tenant?.is_live
  );

  return (
    <div
      id="persona-hub-page"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-8 select-none"
    >
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f1f1f] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              CO-HOST SHOWROOM
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-[#a1a1aa] bg-[#161616] border border-[#262626]">
              {activeCount} Connected Bots
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#fafafa]">
            Persona Hub
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1 max-w-2xl leading-relaxed">
            Browse and switch your AI live stream co-hosts in real time. Your active co-host responds
            to YouTube live chat, delivers roasts, and matches your stream vibe.
          </p>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-personas"
            onClick={() => {
              loadBots();
              loadSettings();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#161616] border border-[#262626] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh co-host status & sync YouTube profiles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f97316]' : ''}`} />
            <span>Sync Bots</span>
          </button>

          {subscriptionTier === 'starter' && onOpenPricing && (
            <button
              id="btn-upgrade-personas"
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f97316]/10 border border-[#f97316]/40 text-xs font-semibold text-[#f97316] hover:bg-[#f97316]/20 transition-all cursor-pointer shadow-[0_0_12px_rgba(249,115,22,0.15)]"
            >
              <Zap className="w-3.5 h-3.5 fill-[#f97316]" />
              <span>Unlock All Personas</span>
            </button>
          )}
        </div>
      </div>

      {/* Custom Maintenance Announcement Banner */}
      {!loading && announcement && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm shadow-[0_0_20px_rgba(245,158,11,0.08)]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium text-xs sm:text-sm leading-snug">
              {announcement}
            </span>
          </div>
          <button
            type="button"
            id="btn-dismiss-persona-announcement"
            onClick={handleDismissAnnouncement}
            className="p-1 rounded-lg text-amber-400/80 hover:text-amber-200 hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
            title="Dismiss announcement"
            aria-label="Dismiss announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Live Stream / Premiere Active: Persona Lock Banner */}
      {isStreamActive && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm leading-snug shadow-[0_0_20px_rgba(245,158,11,0.12)]">
          <Lock className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span>
            <span className="font-bold text-amber-200">Persona Locked:</span>{' '}
            You cannot switch co-hosts during an active live stream or premiere.
          </span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-[#111111] border border-[#262626] rounded-2xl p-6 h-[440px] flex flex-col justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1c1c1c]" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="w-32 h-4 bg-[#1c1c1c] rounded" />
                  <div className="w-20 h-3 bg-[#1c1c1c] rounded" />
                </div>
              </div>
              <div className="w-full h-16 bg-[#1c1c1c] rounded-xl" />
              <div className="flex gap-2">
                <div className="w-16 h-6 bg-[#1c1c1c] rounded-full" />
                <div className="w-20 h-6 bg-[#1c1c1c] rounded-full" />
              </div>
              <div className="w-full h-12 bg-[#1c1c1c] rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Zero Bots Fallback */}
      {!loading && activeCount === 0 && (
        <div className="w-full bg-[#111111] border border-[#262626] rounded-2xl p-12 text-center flex flex-col items-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#1c0a00] border border-[#f97316]/30 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-[#f97316]" />
          </div>
          <h3 className="text-lg font-bold text-[#fafafa]">Co-Hosts Temporarily Unavailable</h3>
          <p className="text-xs text-[#a1a1aa] mt-2 leading-relaxed">
            Our AI co-hosts are currently synchronizing or undergoing scheduled maintenance. Please try
            refreshing the connection.
          </p>
          <button
            onClick={() => {
              loadBots();
              loadSettings();
            }}
            className="mt-6 px-5 py-2.5 rounded-lg bg-[#f97316] text-[#080808] text-xs font-bold hover:bg-[#ea580c] transition-all cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Persona Showroom Grid */}
      {!loading && activeCount > 0 && (
        <div className={getGridContainerClass(activeCount)}>
          {displayPersonas.map((bot) => {
            const isBandya =
              (bot.id || '').toLowerCase().includes('band') ||
              (bot.persona_name || bot.name || '').toLowerCase().includes('band');

            // Dynamic binding directly to Supabase personas table attributes
            const displayName = bot.persona_name || bot.name || 'AI Co-Host';
            const tagline = bot.tagline || 'AI Live Co-host';
            const traits = (bot.traits && bot.traits.length > 0 ? bot.traits : bot.specialtyTags) || [];
            const signatureSlangs = bot.signature_slangs || [];
            const sampleDialogue =
              bot.sample_dialogues && bot.sample_dialogues.length > 0
                ? bot.sample_dialogues[0]
                : (bot.sampleDialogues && bot.sampleDialogues.length > 0 ? bot.sampleDialogues[0] : '');

            const isStarter = !subscriptionTier || subscriptionTier === 'starter';
            const isUnlocked = isStarter
              ? isBandya
              : isPersonaUnlockedForTier(bot.id, (subscriptionTier as SubscriptionTier) || 'starter');
            const isLocked = !isUnlocked;
            const isGated = isLocked;

            const reqTier = getRequiredTierForPersona(bot.id);
            const reqPlanName =
              reqTier === 'pro'
                ? 'Pro'
                : reqTier === 'studio'
                ? 'Studio'
                : SUBSCRIPTION_PLANS[reqTier]?.planName || 'Higher';
            const currentPlanName = isStarter
              ? 'Starter'
              : SUBSCRIPTION_PLANS[subscriptionTier]?.planName || 'Starter';

            // NEVER show "Currently Active Co-Host" on Bhola when on the Starter plan:
            const isCurrent =
              isUnlocked &&
              (activePersona.id === bot.id ||
                (isBandya &&
                  ((activePersona.id || '').toLowerCase().includes('band') ||
                    (activePersona.name || '').toLowerCase().includes('band'))) ||
                activePersona.name?.toLowerCase() === displayName.toLowerCase());

            const isSwitching = switchingBotId === bot.id;
            const cleanHandle = (bot.handle || '').replace(/^@/, '');
            const channelUrl = `https://www.youtube.com/@${cleanHandle}`;

            return (
              <motion.div
                key={bot.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`relative rounded-2xl p-6 flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-[#14100c] border-2 border-[#f97316] shadow-[0_0_35px_rgba(249,115,22,0.25)] transition-all duration-200'
                    : isLocked
                    ? 'bg-[#0f0f0f]/90 border border-zinc-800/90 hover:border-amber-500/40 opacity-50 grayscale hover:grayscale-0 hover:opacity-90 transition-all duration-300 shadow-sm'
                    : 'bg-[#111111] border border-[#222222] hover:border-[#383838] hover:bg-[#141414] shadow-md transition-all duration-200'
                }`}
              >
                {/* Active Indicator Top Tag */}
                <div className="flex items-center justify-between gap-2 mb-5">
                  {isCurrent ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-[#f97316] text-[#080808] flex items-center gap-1.5 shadow-[0_0_12px_rgba(249,115,22,0.5)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#080808] animate-pulse" />
                      Active Co-Host
                    </span>
                  ) : isGated ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Locked on {currentPlanName} • Requires {reqPlanName}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide bg-[#181818] border border-[#282828] text-[#71717a] flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#22c55e]" />
                      Ready to Deploy
                    </span>
                  )}

                  {bot.channel_id && (
                    <a
                      href={channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#71717a] hover:text-[#fafafa] transition-colors p-1"
                      title="View channel on YouTube"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Avatar & Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative shrink-0">
                    <div
                      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full p-0.5 flex items-center justify-center overflow-hidden ${
                        isCurrent
                          ? 'border-2 border-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                          : 'border border-[#2d2d2d] bg-[#1a1a1a]'
                      }`}
                    >
                      {bot.avatar_url ? (
                        <img
                          src={bot.avatar_url}
                          alt={displayName}
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center font-bold text-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-orange-500/30 text-orange-400 select-none ${
                          bot.avatar_url ? 'hidden' : 'flex'
                        }`}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#f97316] text-[#080808] flex items-center justify-center border-2 border-[#14100c]">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-[#fafafa] truncate tracking-tight">
                      {displayName}
                    </h3>
                    <p className="text-xs font-mono text-[#f97316] truncate mt-0.5">
                      @{cleanHandle}
                    </p>
                    <p className="text-xs text-[#a1a1aa] line-clamp-2 mt-1 leading-snug">
                      {tagline}
                    </p>
                  </div>
                </div>

                {/* Personality Traits Pills */}
                <div className="my-3 flex flex-wrap gap-1.5">
                  {traits.slice(0, 4).map((trait, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#1a1a1a] text-[#d4d4d8] border border-[#2a2a2a]"
                    >
                      #{trait.replace(/^#/, '')}
                    </span>
                  ))}
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30">
                      Live Co-Host
                    </span>
                  )}
                </div>

                {/* Signature Slangs Preview */}
                {signatureSlangs && signatureSlangs.length > 0 && (
                  <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-3 my-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#71717a] tracking-wider mb-1.5">
                      <Flame className="w-3 h-3 text-[#f97316]" />
                      Signature Catchphrases
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {signatureSlangs.slice(0, 5).map((slang, sIdx) => (
                        <span
                          key={sIdx}
                          dir="auto"
                          className="text-xs font-mono text-[#fafafa] bg-[#161616] px-2 py-0.5 rounded border border-[#262626]"
                        >
                          "{slang.replace(/^"|"$/g, '')}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sample Dialogue Preview */}
                {sampleDialogue && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[#52525b] tracking-wider mb-1">
                      <MessageSquare className="w-3 h-3 text-[#52525b]" />
                      Sample Banter
                    </div>
                    <p
                      dir="auto"
                      className="text-xs italic text-[#a1a1aa] bg-[#141414] border border-[#222222] rounded-lg p-2.5 line-clamp-3 leading-relaxed min-h-[58px]"
                    >
                      "{sampleDialogue.replace(/^"|"$/g, '')}"
                    </p>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-3 border-t border-[#1f1f1f] mt-2">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] text-[#a1a1aa] text-xs font-semibold flex items-center justify-center gap-2 cursor-default"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                      <span>Currently Active Co-Host</span>
                    </button>
                  ) : isGated ? (
                    // PLAN-LOCKED: Always show upgrade CTA regardless of stream status
                    <button
                      id={`btn-unlock-${bot.id}`}
                      onClick={() => handleSelect(bot)}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.15)] group"
                    >
                      <Lock className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
                      <span>Upgrade to Unlock ({reqPlanName}) →</span>
                    </button>
                  ) : isStreamActive ? (
                    // LIVE-STREAM / PREMIERE LOCK: Tier-unlocked persona is blocked during broadcast
                    <button
                      id={`btn-locked-stream-${bot.id}`}
                      onClick={() => handleSelect(bot)}
                      disabled={isStreamActive}
                      className="w-full h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400/80 text-xs font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                      title="Co-host switching is locked during an active stream or premiere"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      <span>Locked (Stream Active)</span>
                    </button>
                  ) : (
                    <button
                      id={`btn-switch-${bot.id}`}
                      onClick={() => handleSelect(bot)}
                      disabled={isSwitching || isStreamActive}
                      className={`w-full h-11 rounded-xl bg-[#f97316] text-[#080808] hover:bg-[#ea580c] active:scale-[0.99] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.3)] ${
                        isStreamActive ? 'opacity-50 cursor-not-allowed' : 'disabled:opacity-50'
                      }`}
                    >
                      {isSwitching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#080808]" />
                          <span>Switching Co-Host...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          <span>Switch to {displayName} →</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
