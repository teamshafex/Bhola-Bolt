import React, { useState, useEffect } from 'react';
import { Copy, Check, Clock } from 'lucide-react';
import { StreamStatus } from '../types';
import { SubscriptionTier } from '@bhola/database';

interface HeaderBarProps {
  streamStatus: StreamStatus;
  onChangeStreamStatus: (status: StreamStatus) => void;
  botEnabled: boolean;
  onToggleBot: () => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
  channelName?: string;
  channelHandle?: string;
  channelId?: string;
  avatarUrl?: string | null;
  avatarInitial?: string;
  subscriptionTier?: SubscriptionTier;
  onOpenPricing?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  streamStatus,
  onChangeStreamStatus,
  botEnabled,
  onToggleBot,
  showToast,
  channelName: propChannelName,
  channelHandle: propChannelHandle,
  channelId: propChannelId,
  avatarUrl: propAvatarUrl,
  avatarInitial: propAvatarInitial,
  subscriptionTier = 'starter',
  onOpenPricing,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  // Read cached channel from localStorage on every render pass.
  // When a user logs in with Google OAuth, the channel is resolved in the background by
  // async handleSession. Direct read picks up the value on the next re-render.
  const cached = (() => {
    try {
      const raw = localStorage.getItem('bhola_cached_channel');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const channelName = propChannelName || cached?.name || '';
  const channelHandle = propChannelHandle || cached?.handle || '';
  const rawChannelId = propChannelId || cached?.channelId || '';
  const channelId = /^\d+$/.test(rawChannelId) ? '' : rawChannelId;
  const avatarUrl = propAvatarUrl || cached?.avatarUrl || null;
  const avatarInitial =
    propAvatarInitial ||
    cached?.avatarInitial ||
    (channelName ? channelName[0]?.toUpperCase() : 'S');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const truncatedChannelId = channelId
    ? channelId.length > 16
      ? `${channelId.slice(0, 8)}...${channelId.slice(-4)}`
      : channelId
    : '';

  const handleCopyChatId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channelId) {
      showToast('error', 'No Channel ID available to copy');
      return;
    }
    navigator.clipboard?.writeText(channelId);
    setCopiedId(true);
    showToast('info', 'Channel ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <header
      id="dashboard-header-bar"
      className="sticky top-0 w-full h-16 bg-[#111111] border-b border-[#262626] px-4 sm:px-6 flex items-center justify-between z-40"
    >
      {/* LEFT: CHANNEL IDENTITY */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#262626] flex items-center justify-center font-bold text-sm text-[#f97316] shrink-0 shadow-inner">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={channelName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            avatarInitial
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[#fafafa] truncate" title={channelName}>
            {channelName}
          </h1>
          <div className="hidden sm:flex items-center gap-1.5">
            {channelHandle && (
              <span className="font-mono text-[11px] text-[#f97316] font-semibold" title={channelHandle}>
                {channelHandle}
              </span>
            )}
            {channelHandle && channelId && (
              <span className="text-[10px] text-zinc-600">•</span>
            )}
            {channelId && (
              <>
                <span className="font-mono text-[10px] text-[#71717a]" title={channelId}>
                  {truncatedChannelId}
                </span>
                <button
                  id="btn-copy-livechat-id"
                  onClick={handleCopyChatId}
                  title={`Copy Channel ID (${channelId})`}
                  className="text-[#71717a] hover:text-[#f97316] transition-colors p-0.5 cursor-pointer"
                >
                  {copiedId ? (
                    <Check className="w-2.5 h-2.5 text-[#22c55e]" />
                  ) : (
                    <Copy className="w-2.5 h-2.5" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: STATUS BADGE */}
      {/* CENTER: STATUS BADGE (Read-Only Indicator) */}
      <div id="badge-stream-status" className="select-none flex items-center">
        {streamStatus === 'live' && (
          <div className="bg-red-500/10 text-red-500 border border-red-500/30 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="tracking-wide font-mono">● LIVE</span>
          </div>
        )}

        {streamStatus === 'premiere' && (
          <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="tracking-wide font-mono">PREMIERE</span>
          </div>
        )}

        {streamStatus === 'offline' && (
          <div className="bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span className="tracking-wide font-mono">OFFLINE</span>
          </div>
        )}
      </div>

      {/* RIGHT ACTIONS: UPGRADE BUTTON & MASTER BOT TOGGLE */}
      <div className="flex items-center gap-3 sm:gap-4">
        {subscriptionTier === 'studio' || subscriptionTier === 'enterprise' ? (
          <div
            id="badge-elite-studio"
            className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 shadow-inner select-none"
            title={`${subscriptionTier === 'enterprise' ? 'Enterprise' : 'Studio'} Tier Active`}
          >
            <span className="text-[#eab308]">★</span>
            <span>{subscriptionTier === 'enterprise' ? 'Enterprise' : 'Studio'}</span>
          </div>
        ) : (
          <button
            id="btn-header-upgrade"
            onClick={onOpenPricing}
            className="px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-[#202023] border border-zinc-800 hover:border-zinc-500 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span>Upgrade</span>
            <span className="text-[#f97316]">⚡</span>
          </button>
        )}

        {/* MASTER BOT TOGGLE */}
        <div className="flex flex-col items-center gap-0.5 select-none">
          <span className="text-[10px] uppercase tracking-widest text-[#a1a1aa] font-semibold">
            BOT
          </span>
          <button
            id="btn-master-bot-toggle"
            onClick={onToggleBot}
            role="switch"
            aria-checked={botEnabled}
            aria-label="Master Bot Toggle"
            className={`relative w-[56px] h-[28px] rounded-full p-0.5 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]
              ${botEnabled ? 'bg-[#f97316]' : 'bg-[#262626]'}`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-[#fafafa] shadow-md transform transition-transform duration-200
                ${botEnabled ? 'translate-x-[28px]' : 'translate-x-[2px]'}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
