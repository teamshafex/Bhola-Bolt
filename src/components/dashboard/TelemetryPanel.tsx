import React, { useState, useEffect } from 'react';
import { Activity, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Persona, StreamStatus } from '../../types';
import {
  SubscriptionTier,
  SUBSCRIPTION_PLANS,
  DAILY_LIMITS,
  planTierToSubscriptionTier,
  calculateResetFormatted,
} from '@bhola/database';

interface TelemetryPanelProps {
  activePersona?: Persona | null;
  streamStatus: StreamStatus;
  botEnabled?: boolean;
  tokensUsed?: number;
  sessionCost?: number;
  avgLatency?: number;
  messagesSent?: number;
  subscriptionTier?: SubscriptionTier | string;
  maxTokens?: number;
  tenantId?: string;
  onOpenPricing?: () => void;
  onNavigatePersonas?: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  activePersona,
  streamStatus,
  botEnabled = false,
  tokensUsed = 0,
  sessionCost = 0,
  avgLatency = 0,
  messagesSent = 0,
  subscriptionTier = 'starter',
  maxTokens,
  tenantId = 'a0000000-0000-0000-0000-000000000001',
  onOpenPricing,
  onNavigatePersonas,
}) => {
  const normalizedTier = planTierToSubscriptionTier(subscriptionTier);
  const simLimit = DAILY_LIMITS.simulator[normalizedTier];
  const liveLimit = DAILY_LIMITS.liveStream[normalizedTier];

  const [quota, setQuota] = useState<{
    simulator: { used: number; limit: number; remaining: number };
    liveStream: { used: number; limit: number; remaining: number };
    resetFormatted: string;
  }>({
    simulator: { used: 0, limit: simLimit, remaining: simLimit === -1 ? -1 : simLimit },
    liveStream: { used: 0, limit: liveLimit, remaining: liveLimit === -1 ? -1 : liveLimit },
    resetFormatted: calculateResetFormatted(),
  });

  // Fetch today's split quota usage on mount, on tier/tenant changes, and on message updates
  useEffect(() => {
    let isMounted = true;
    async function loadQuota() {
      try {
        const res = await fetch(`/api/streamer/daily-quota?tenantId=${encodeURIComponent(tenantId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.quota) {
            setQuota(data.quota);
          }
        }
      } catch {
        // Safe fallback in offline mode
      }
    }
    loadQuota();

    const timer = setInterval(() => {
      if (isMounted) {
        setQuota((prev) => ({
          ...prev,
          resetFormatted: calculateResetFormatted(),
        }));
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [tenantId, normalizedTier, messagesSent]);
  // Timer starts at 0 — ticks ONLY when streamStatus === 'live' AND botEnabled === true.
  // 'premiere' is a pre-show countdown state; the session has not started so the timer
  // must stay at 00:00:00 until the broadcast actually goes live.
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const isLive = streamStatus === 'live'; // strictly live — not premiere, not offline
  const isActive = isLive && botEnabled;

  const ceilingMap: Record<SubscriptionTier, number> = {
    starter: 30000,
    pro: 150000,
    studio: 500000,
    enterprise: 2000000,
  };
  const tokenCeiling = maxTokens || ceilingMap[subscriptionTier] || 30000;
  const percentUsed = Math.min(100, (tokensUsed / tokenCeiling) * 100);

  const tierLabelMap: Record<SubscriptionTier, string> = {
    starter: 'Starter',
    pro: 'Pro',
    studio: 'Studio',
    enterprise: 'Enterprise',
  };
  const tierLabel = tierLabelMap[subscriptionTier] || 'Plan';

  const hasActivePersona = Boolean(activePersona && (activePersona.name || activePersona.id));
  const rawHandle = activePersona?.handle?.replace(/^@/, '').trim() || '';
  const botHandle =
    rawHandle && rawHandle !== 'bandiya' && rawHandle !== 'bandya' && rawHandle !== 'bhola' && rawHandle !== 'baburao'
      ? rawHandle
      : (activePersona?.id?.toLowerCase().includes('band') || activePersona?.name?.toLowerCase().includes('band'))
      ? 'bandya-hoon'
      : (activePersona?.id?.toLowerCase().includes('babu') || activePersona?.name?.toLowerCase().includes('babu'))
      ? 'baburao-hoon'
      : 'bhola-hoon';

  const avatarSrc =
    activePersona?.avatar_url ||
    activePersona?.avatarUrl ||
    ((activePersona?.id?.toLowerCase().includes('band') || activePersona?.name?.toLowerCase().includes('band'))
      ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
      : (activePersona?.id?.toLowerCase().includes('babu') || activePersona?.name?.toLowerCase().includes('babu'))
      ? 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj'
      : (activePersona?.id?.toLowerCase().includes('bhola') || activePersona?.name?.toLowerCase().includes('bhola'))
      ? 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj'
      : null);

  // Reset and restart timer whenever active state changes.
  // Strict guard: interval only starts when isLive (status === 'live') AND botEnabled.
  useEffect(() => {
    if (!isActive) {
      // Stream is offline, bot is paused, or status is 'premiere' — lock timer at zero
      setSecondsElapsed(0);
      return;
    }

    // isActive === true: stream is genuinely live AND bot is running
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isActive]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getLatencyColor = (ms: number) => {
    if (ms === 0) return 'text-[#52525b]';
    if (ms < 500) return 'text-[#22c55e]';
    if (ms <= 800) return 'text-[#eab308]';
    return 'text-[#ef4444]';
  };

  return (
    <div
      id="panel-session-telemetry"
      className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg flex flex-col justify-between"
    >
      {/* Panel Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
            SESSION TELEMETRY
          </span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-live-pulse" />
          )}
        </div>

        {/* Metric Tiles (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Tile 1: TOKENS USED */}
          <div className="bg-[#1c1c1c] rounded-lg p-4 flex flex-col gap-1 border border-[#262626]/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#52525b] font-semibold">
                TOKENS USED
              </span>
              <span className="text-[10px] font-mono text-[#f97316] font-semibold">
                {isActive || tokensUsed > 0 ? `${percentUsed.toFixed(0)}%` : '—'}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[#fafafa]">
              {isActive || tokensUsed > 0 ? tokensUsed.toLocaleString() : '0'}
            </span>
            <div className="w-full bg-[#262626] h-1.5 rounded-full overflow-hidden my-1">
              <div
                className="bg-[#f97316] h-full rounded-full transition-all duration-300"
                style={{ width: isActive || tokensUsed > 0 ? `${Math.min(100, Math.max(1, percentUsed))}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-[#52525b]">
              of {tokenCeiling.toLocaleString()} {tierLabel} limit
            </span>
          </div>

          {/* Tile 2: SESSION COST */}
          <div className="bg-[#1c1c1c] rounded-lg p-4 flex flex-col gap-1 border border-[#262626]/40">
            <span className="text-[10px] uppercase tracking-wider text-[#52525b] font-semibold">
              SESSION COST
            </span>
            <span className="font-mono text-2xl font-bold text-[#f97316]">
              ${isActive || sessionCost > 0 ? sessionCost.toFixed(3) : '0.000'}
            </span>
            <span className="text-xs text-[#52525b]">this stream</span>
          </div>

          {/* Tile 3: AVG LATENCY */}
          <div className="bg-[#1c1c1c] rounded-lg p-4 flex flex-col gap-1 border border-[#262626]/40">
            <span className="text-[10px] uppercase tracking-wider text-[#52525b] font-semibold">
              AVG LATENCY
            </span>
            <span className={`font-mono text-2xl font-bold ${getLatencyColor(isActive || avgLatency > 0 ? avgLatency : 0)}`}>
              {isActive || avgLatency > 0 ? `${avgLatency}ms` : '—'}
            </span>
            <span className="text-xs text-[#52525b]">API response</span>
          </div>

          {/* Tile 4: MESSAGES SENT + SESSION TIMER */}
          <div className="bg-[#1c1c1c] rounded-lg p-4 flex flex-col gap-1 border border-[#262626]/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-[#52525b] font-semibold">
                MESSAGES SENT
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                {(SUBSCRIPTION_PLANS[subscriptionTier]?.dailyMessageLimit || 80) >= 5000
                  ? 'Fair use'
                  : `${SUBSCRIPTION_PLANS[subscriptionTier]?.dailyMessageLimit || 80}/day`}
              </span>
            </div>
            <span className="font-mono text-2xl font-bold text-[#fafafa]">
              {isActive || messagesSent > 0 ? messagesSent : 0}
            </span>
            <div className="flex items-center gap-1 font-mono text-xs text-[#f97316]">
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-live-pulse inline-block" />
              )}
              <span className={isActive ? 'text-[#f97316]' : 'text-[#52525b]'}>
                {formatTimer(secondsElapsed)}
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated "Today's Quota" Section */}
        <div className="mt-4 bg-[#1c1c1c] border border-[#262626]/60 rounded-lg p-3.5 text-xs select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white text-[11px] uppercase tracking-wider">
              Today's Quota
            </span>
            <span className="font-mono text-[10px] text-zinc-500">
              Resets in: {quota.resetFormatted}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Chat Simulator */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-300 font-medium">Chat Simulator</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-white font-semibold">
                    {quota.simulator.used} / {quota.simulator.limit === -1 ? '∞' : quota.simulator.limit}
                  </span>
                  <span className="text-zinc-500">
                    ({quota.simulator.limit === -1 ? 'Unlimited' : `${quota.simulator.remaining} remaining`})
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    quota.simulator.limit !== -1 && quota.simulator.used >= quota.simulator.limit
                      ? 'bg-red-500'
                      : 'bg-[#f97316]'
                  }`}
                  style={{
                    width: `${
                      quota.simulator.limit === -1
                        ? 100
                        : Math.min(100, Math.round((quota.simulator.used / quota.simulator.limit) * 100))
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Live Bot Replies */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-300 font-medium">Live Bot Replies</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-white font-semibold">
                    {quota.liveStream.used} / {quota.liveStream.limit === -1 ? '∞' : quota.liveStream.limit}
                  </span>
                  <span className="text-zinc-500">
                    ({quota.liveStream.limit === -1 ? 'Unlimited' : `${quota.liveStream.remaining} remaining`})
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    quota.liveStream.limit !== -1 && quota.liveStream.used >= quota.liveStream.limit
                      ? 'bg-red-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${
                      quota.liveStream.limit === -1
                        ? 100
                        : Math.min(100, Math.round((quota.liveStream.used / quota.liveStream.limit) * 100))
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Starter Tier Subtle Upgrade Banner */}
          {normalizedTier === 'starter' && (
            <div className="mt-2.5 pt-2 border-t border-[#262626] flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400 truncate">
                ⚡ Upgrade to Pro for 200 simulator + 400 live replies + Bhola unlocked
              </span>
              {onOpenPricing && (
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="shrink-0 text-[11px] font-semibold text-[#f97316] hover:text-orange-400 underline transition-colors cursor-pointer"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* REDESIGNED ACTIVE CO-HOST CARD */}
      {hasActivePersona && activePersona ? (
        <div
          id="card-telemetry-active-cohost"
          role="button"
          tabIndex={0}
          onClick={onNavigatePersonas}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigatePersonas?.();
            }
          }}
          className="w-full mt-4 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-orange-500/50 transition-all duration-200 cursor-pointer flex items-center justify-between group"
          title="Click to manage co-host in Persona Hub"
        >
          {/* Left Section (Profile Info) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with Live Ring */}
            <div className="relative shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={activePersona.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-orange-500/40 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const parent = (e.target as HTMLElement).parentElement;
                    const fallbackEl = parent?.querySelector('.avatar-emoji-fallback') as HTMLElement;
                    if (fallbackEl) fallbackEl.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="avatar-emoji-fallback w-9 h-9 rounded-full border border-orange-500/40 shrink-0 bg-zinc-800 items-center justify-center text-sm"
                style={{ display: avatarSrc ? 'none' : 'flex' }}
              >
                {activePersona.avatarEmoji || '🔥'}
              </div>
              {/* Tiny green online pulse indicator dot at the corner of the avatar */}
              <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-zinc-900" />
              </span>
            </div>

            {/* Identity */}
            <div className="flex flex-col text-left min-w-0">
              <span className="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors truncate">
                {activePersona.name}
              </span>
              <span className="text-xs text-zinc-400 truncate">
                @{botHandle}
              </span>
            </div>
          </div>

          {/* Right Section (Action Badge) */}
          <span className="text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 group-hover:bg-orange-500/20 transition-all shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Manage Co-Host &rarr;</span>
          </span>
        </div>
      ) : (
        /* Empty / Fallback State */
        <div
          id="card-telemetry-cohost-fallback"
          role="button"
          tabIndex={0}
          onClick={onNavigatePersonas}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigatePersonas?.();
            }
          }}
          className="w-full mt-4 p-3 rounded-xl bg-zinc-900/70 border border-dashed border-zinc-800 hover:border-orange-500/50 transition-all duration-200 cursor-pointer flex items-center justify-between group"
          title="Click to select co-host in Persona Hub"
        >
          {/* Left Section Placeholder */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full border border-dashed border-zinc-700 bg-zinc-800/60 flex items-center justify-center shrink-0 text-zinc-500">
              <Sparkles className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition-colors" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-sm font-semibold text-zinc-300 group-hover:text-orange-400 transition-colors truncate">
                No Active Co-Host
              </span>
              <span className="text-xs text-zinc-500 truncate">
                Select an AI co-host for chat
              </span>
            </div>
          </div>

          {/* Right Section (Select Action) */}
          <span className="text-xs font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 group-hover:text-orange-400 group-hover:border-orange-500/30 group-hover:bg-orange-500/10 transition-all shrink-0">
            <span>Select Co-Host &rarr;</span>
          </span>
        </div>
      )}
    </div>
  );
};
