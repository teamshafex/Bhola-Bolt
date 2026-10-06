import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  fetchActiveBotPersonas,
  ActiveBotPersona,
  SubscriptionTier,
  isPersonaUnlockedForTier,
  isPersonaPublic,
  getRequiredTierForPersona,
  toCanonicalPersonaId,
} from '@bhola/database';

interface Step2PersonaProps {
  selectedBot?: ActiveBotPersona | null;
  onSelectBot?: (bot: ActiveBotPersona) => void;
  onLockConfirmed: (bot: ActiveBotPersona) => void;
  streamerPlan?: SubscriptionTier | string;
  showToast?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const Step2Persona: React.FC<Step2PersonaProps> = ({
  selectedBot: externalSelectedBot,
  onSelectBot,
  onLockConfirmed,
  streamerPlan,
  showToast,
}) => {
  const effectivePlan = (streamerPlan || localStorage.getItem('bhola_subscription_tier') || 'starter') as string;
  const normalizedTier: SubscriptionTier =
    effectivePlan === 'free' || effectivePlan === 'starter'
      ? 'starter'
      : (effectivePlan as SubscriptionTier) || 'starter';
  const isStarter = normalizedTier === 'starter';

  const [bots, setBots] = useState<ActiveBotPersona[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  // Strict Default Selection based on Plan: Default to an unlocked persona under current tier
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (externalSelectedBot?.id) {
      const canonical = toCanonicalPersonaId(externalSelectedBot.id);
      if (isPersonaUnlockedForTier(canonical, normalizedTier)) {
        return externalSelectedBot.id;
      }
    }
    return isStarter ? 'bandya' : '';
  });
  const initialFetchDone = useRef(false);

  // Fetch active bots ONCE on mount with empty dependency array
  const loadBots = async () => {
    setLoading(true);
    try {
      const fetched = await fetchActiveBotPersonas();
      setBots(fetched);
      if (fetched.length > 0) {
        setSelectedId((prev) => {
          const publicBots = fetched.filter((b) => isPersonaPublic(b) && (b as any).is_active !== false);
          if (prev) {
            const match = publicBots.find((b) => b.id === prev);
            if (match && isPersonaUnlockedForTier(toCanonicalPersonaId(match.id), normalizedTier)) {
              return prev;
            }
          }
          if (externalSelectedBot?.id) {
            const match = publicBots.find((b) => b.id === externalSelectedBot.id);
            if (match && isPersonaUnlockedForTier(toCanonicalPersonaId(match.id), normalizedTier)) {
              return externalSelectedBot.id;
            }
          }
          const firstUnlocked = publicBots.find((b) =>
            isPersonaUnlockedForTier(toCanonicalPersonaId(b.id), normalizedTier)
          );
          return firstUnlocked?.id || publicBots[0]?.id || '';
        });
      }
    } catch (err) {
      console.warn('[Step2Persona] Error loading bot accounts from Supabase:', err);
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      loadBots();
    }
  }, []);

  // Explicit Persona Sorting (1st: Bandya -> 2nd: Bhola -> 3rd: BabuRao)
  const getPersonaOrder = (id: string = '') => {
    const clean = id.toLowerCase();
    if (clean.includes('band')) return 1; // 1st: Bandya
    if (clean.includes('bhola')) return 2; // 2nd: Bhola
    if (clean.includes('babu')) return 3;  // 3rd: BabuRao
    return 4;
  };

  const displayBots = useMemo(() => {
    return [...bots]
      .filter((b) => isPersonaPublic(b) && (b as any).is_active !== false)
      .sort((a, b) => getPersonaOrder(a.id) - getPersonaOrder(b.id));
  }, [bots]);

  const getStep2GridClass = (count: number) => {
    if (count === 1) return 'w-full max-w-md mx-auto grid grid-cols-1 gap-6';
    if (count === 2) return 'w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6';
    return 'w-full grid grid-cols-1 md:grid-cols-3 gap-6';
  };

  // Compute currently selected bot safely without triggering re-render loops
  const currentBot = useMemo(() => {
    if (displayBots.length === 0) return externalSelectedBot || null;
    const match = displayBots.find((b) => b.id === selectedId);
    if (match && isPersonaUnlockedForTier(toCanonicalPersonaId(match.id), normalizedTier)) {
      return match;
    }
    const firstUnlocked = displayBots.find((b) =>
      isPersonaUnlockedForTier(toCanonicalPersonaId(b.id), normalizedTier)
    );
    return firstUnlocked || displayBots[0];
  }, [displayBots, selectedId, externalSelectedBot, normalizedTier]);

  // Automatically sync initial selection to parent state
  useEffect(() => {
    if (currentBot && onSelectBot) {
      const canonicalId = toCanonicalPersonaId(currentBot.id);
      if (isPersonaUnlockedForTier(canonicalId, normalizedTier) && externalSelectedBot?.id !== currentBot.id) {
        onSelectBot(currentBot);
      }
    }
  }, [currentBot, onSelectBot, normalizedTier, externalSelectedBot?.id]);

  const handleCardClick = (bot: ActiveBotPersona) => {
    const canonicalId = toCanonicalPersonaId(bot.id || bot.persona_id || bot.name);
    const isUnlocked = isPersonaUnlockedForTier(canonicalId, normalizedTier);

    // Prevent selecting locked personas on current tier
    if (!isUnlocked) {
      const reqTier = getRequiredTierForPersona(canonicalId);
      const tierName = reqTier === 'pro' ? 'Pro' : reqTier === 'studio' ? 'Studio' : 'Enterprise';
      showToast?.('info', `${bot.persona_name || bot.name} is exclusive to ${tierName} Plan`);
      return;
    }

    setSelectedId(bot.id);
    if (onSelectBot) {
      onSelectBot(bot);
    }
  };

  const handleProceed = () => {
    if (!currentBot) return;

    const canonicalId = toCanonicalPersonaId(currentBot.id || currentBot.persona_id || currentBot.name);
    const isUnlocked = isPersonaUnlockedForTier(canonicalId, normalizedTier);

    // Hard-validate: Never allow advancing to Moderator Step with a locked persona
    if (!isUnlocked) {
      const reqTier = getRequiredTierForPersona(canonicalId);
      const tierName = reqTier === 'pro' ? 'Pro' : reqTier === 'studio' ? 'Studio' : 'Enterprise';
      showToast?.('error', `${currentBot.persona_name || currentBot.name} is exclusive to ${tierName} Plan. Please select an unlocked co-host.`);
      return;
    }

    onLockConfirmed(currentBot);
  };

  return (
    <div
      id="onboarding-step-2"
      className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 bg-[#080808]"
    >
      {/* Progress Indicator Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <motion.div
          animate={{ scale: 1.25 }}
          className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]"
        />
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
      </div>

      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-10">
          <span className="text-xs uppercase tracking-widest text-[#52525b] font-semibold">
            STEP 1 OF 3
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa] mt-2 tracking-tight">
            Choose Your Stream's Voice
          </h2>
          <p className="text-sm text-[#a1a1aa] mt-2 max-w-xl mx-auto">
            Pick one personality. Lock it for the session. No mid-stream changes.
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#111111] border border-[#262626] rounded-xl p-6 h-96 flex flex-col items-center justify-between"
              >
                <div className="w-20 h-20 rounded-full bg-[#1c1c1c] mt-2" />
                <div className="w-32 h-5 bg-[#1c1c1c] rounded mt-4" />
                <div className="w-24 h-3 bg-[#1c1c1c] rounded mt-2" />
                <div className="w-44 h-4 bg-[#1c1c1c] rounded mt-2" />
                <div className="w-full h-12 bg-[#1c1c1c] rounded mt-4" />
                <div className="w-full h-8 bg-[#1c1c1c] rounded mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Fallback State: Bots Temporarily Unavailable */}
        {!loading && displayBots.length === 0 && (
          <div className="w-full max-w-md bg-[#111111] border border-[#262626] rounded-2xl p-8 flex flex-col items-center text-center my-6 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#1c0a00] border border-[#f97316]/40 flex items-center justify-center text-[#f97316] mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-[#fafafa]">Co-Hosts Temporarily Unavailable</h3>
            <p className="text-sm text-[#a1a1aa] mt-2 leading-relaxed">
              Our AI co-hosts are currently warming up or undergoing maintenance. Please try refreshing in a moment.
            </p>
            <button
              id="btn-retry-connection"
              onClick={loadBots}
              className="mt-6 px-5 py-2.5 rounded-lg bg-[#f97316] text-[#080808] font-semibold text-sm hover:bg-[#ea580c] transition-colors flex items-center gap-2 shadow-[0_0_16px_rgba(249,115,22,0.25)] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Active Bots Grid */}
        {!loading && displayBots.length > 0 && (
          <div className={getStep2GridClass(displayBots.length)}>
            {displayBots.map((p) => {
              const isBandya =
                (p.id || '').toLowerCase().includes('band') ||
                (p.persona_name || p.name || '').toLowerCase().includes('band');

              const displayName = isBandya ? 'Bandya' : p.name;
              const tagline = isBandya ? 'The Stressed Comedic Crybaby' : p.tagline;
              const traits = isBandya
                ? ['#DramaKing', '#OverStressed', '#CowardRoaster']
                : p.traits || [];
              const slangs = isBandya
                ? ['maalik', 'soor-veer', 'bottal ka jin samjha hai?', 'maroge tum maroge', 'itna sundar hu']
                : p.signature_slangs && p.signature_slangs.length > 0
                ? p.signature_slangs
                : p.sample_dialogues || [];

              const canonicalId = toCanonicalPersonaId(p.id || p.persona_id || p.name);
              const isUnlocked = isPersonaUnlockedForTier(canonicalId, normalizedTier);
              const isLocked = !isUnlocked;
              const reqTier = getRequiredTierForPersona(canonicalId);
              const lockBadgeText = reqTier === 'pro' ? 'Requires Pro' : reqTier === 'studio' ? 'Requires Studio' : 'Locked';

              const isSelected = !isLocked && (currentBot?.id === p.id);
              const cleanHandle = (p.handle || (isBandya ? 'BandyaAI' : '')).replace(/^@/, '');

              return (
                <div
                  key={p.id}
                  id={`persona-card-${p.id}`}
                  onClick={() => handleCardClick(p)}
                  className={`relative min-w-0 w-full overflow-hidden rounded-xl p-6 transition-all duration-200 flex flex-col items-center text-center
                    ${
                      isLocked
                        ? 'bg-[#0f0f0f]/60 border border-[#222222] opacity-60 cursor-not-allowed hover:border-[#2a2a2a]'
                        : isSelected
                        ? 'bg-[#1c0a00] border-2 border-[#f97316] shadow-[0_0_20px_rgba(249,115,22,0.15)] cursor-pointer'
                        : 'bg-[#111111] border border-[#262626] hover:border-[#f97316]/40 hover:bg-[#111111]/90 cursor-pointer'
                    }`}
                >
                  {/* Selection Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#f97316] text-[#080808] flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Lock Badge for Gated Personas */}
                  {isLocked && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 shadow-sm">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>{lockBadgeText}</span>
                    </div>
                  )}

                  {/* Avatar Area: Real YouTube Channel DP */}
                  <div className="w-20 h-20 rounded-full bg-[#1c1c1c] border border-[#262626] overflow-hidden flex items-center justify-center text-3xl shadow-inner mt-2 shrink-0">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="font-bold text-2xl text-[#f97316]">
                        {isBandya ? '😩' : displayName ? displayName[0]?.toUpperCase() : 'B'}
                      </span>
                    )}
                  </div>

                  {/* Persona Name */}
                  <h3 className="text-xl font-bold text-[#fafafa] mt-4 tracking-tight truncate max-w-full text-center">
                    {displayName}
                  </h3>

                  {/* Real Handle */}
                  {cleanHandle && (
                    <p className="text-xs text-[#f97316] font-mono mt-0.5 truncate max-w-full text-center">
                      @{cleanHandle}
                    </p>
                  )}

                  {/* Personality Tagline */}
                  <p className="text-sm text-[#a1a1aa] mt-1 font-medium truncate max-w-full text-center">
                    {tagline}
                  </p>

                  {/* Sample Dialogue Chips */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 min-h-[72px] w-full overflow-hidden">
                    {slangs.slice(0, 5).map((sample, idx) => (
                      <span
                        key={idx}
                        dir="auto"
                        className="bg-[#1c1c1c] border border-[#262626] rounded-full px-3 py-1 text-xs text-[#fafafa] max-w-full truncate"
                      >
                        "{sample.replace(/^"|"$/g, '')}"
                      </span>
                    ))}
                  </div>

                  {/* Specialty Tags */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 pt-4 border-t border-[#1a1a1a] w-full overflow-hidden">
                    {traits.slice(0, 4).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#1c0a00] text-[#f97316] text-xs font-medium rounded-full px-3 py-1 max-w-full truncate"
                      >
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lock CTA */}
        <AnimatePresence>
          {currentBot && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm mt-8"
            >
              <button
                id="btn-lock-persona-cta"
                onClick={handleProceed}
                className="w-full h-12 rounded-lg bg-[#f97316] text-[#080808] font-semibold text-base
                           flex items-center justify-center gap-2 hover:bg-[#ea580c] transition-colors duration-150
                           shadow-[0_0_20px_rgba(249,115,22,0.25)] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808] cursor-pointer"
              >
                <span>
                  Continue with {currentBot.name} →
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
