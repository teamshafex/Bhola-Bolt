import React, { useState, useEffect } from 'react';
import {
  Check,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Loader2,
  Tv2,
  Users,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { YouTubeChannelItem } from '@bhola/database';
import { sanitizeClientError } from '../../lib/errorSanitizer';

interface StepSelectChannelProps {
  onChannelSelected: (channel: YouTubeChannelItem) => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
  onSignOut: () => void;
  onUserInteraction?: () => void;
}

export const StepSelectChannel: React.FC<StepSelectChannelProps> = ({
  onChannelSelected,
  showToast,
  onSignOut,
  onUserInteraction,
}) => {
  const { channels, channelError, isLoadingChannels, fetchChannels, selectChannel } = useAuth();

  // Auto-Select Single Channel:
  // Initialize with the single channel ID if only 1 channel exists
  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => {
    return channels.length === 1 ? channels[0].channelId : '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize selection state when channels load or update
  useEffect(() => {
    if (channels.length === 1) {
      if (selectedChannelId !== channels[0].channelId) {
        setSelectedChannelId(channels[0].channelId);
      }
    } else if (channels.length > 1 && selectedChannelId) {
      // Validate that currently selected channel still exists
      const exists = channels.some((c) => c.channelId === selectedChannelId);
      if (!exists) {
        setSelectedChannelId('');
      }
    }
  }, [channels, selectedChannelId]);

  // Derived effective channel selection:
  // Pre-select single channel immediately even before useEffect commits, avoiding flash of unselected state
  const activeChannelId = selectedChannelId || (channels.length === 1 ? channels[0]?.channelId : '');
  const selectedChannel = channels.find((c) => c.channelId === activeChannelId) || null;

  const handleCardClick = (chId: string) => {
    onUserInteraction?.();
    setSelectedChannelId(chId);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return; // Prevent duplicate triggers

    const chosen = selectedChannel;
    if (!chosen) {
      showToast('error', 'Please select a YouTube channel to continue.');
      return;
    }

    onUserInteraction?.();
    setIsSubmitting(true);

    try {
      const updatedTenant = await selectChannel(chosen);
      if (updatedTenant) {
        showToast('success', `Channel "${chosen.title}" verified and connected!`);
        onChannelSelected(chosen);
      } else {
        showToast('error', 'Failed to save channel selection. Please retry.');
      }
    } catch (err) {
      showToast('error', sanitizeClientError(err, 'Failed to save channel selection. Please retry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="onboarding-select-channel"
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-bg overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-brand opacity-[0.03] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-xl flex flex-col items-center text-center"
      >
        {/* Header Icon & Title */}
        <div className="w-12 h-12 rounded-2xl bg-[#1c0a00] border border-brand/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
          <Tv2 className="w-6 h-6 text-brand" />
        </div>

        <h1 className="text-2xl font-bold text-[#fafafa] tracking-tight mb-2">
          Select Your YouTube Channel
        </h1>
        <p className="text-sm text-text-secondary max-w-md mb-8">
          Choose the channel where Bhola will act as your dedicated AI co-host.
        </p>

        {/* 1. LOADING STATE */}
        {isLoadingChannels && (
          <div className="w-full p-8 rounded-xl bg-surface border border-border flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-sm font-medium text-[#fafafa]">Scanning YouTube for your channels...</p>
            <p className="text-xs text-[#71717a]">Querying official Google YouTube Data API v3</p>
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!isLoadingChannels && channelError && (
          <div className="w-full p-6 rounded-xl bg-red-950/20 border border-red-500/30 text-left flex flex-col gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-400">
                  YouTube Connection Notice
                </h3>
                <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                  We were unable to connect with your YouTube account. Please verify your Google account has an active YouTube channel and try again.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => fetchChannels()}
                className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] text-white text-xs font-medium flex items-center gap-2 transition-colors border border-[#333]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Channel Fetch</span>
              </button>

              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign in with different account</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. ZERO CHANNELS FOUND */}
        {!isLoadingChannels && !channelError && channels.length === 0 && (
          <div className="w-full p-8 rounded-xl bg-surface border border-border text-center flex flex-col items-center gap-4 mb-6">
            <div className="p-3 rounded-full bg-[#1a1a1a] text-[#71717a]">
              <Tv2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">No YouTube Channel Found</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-sm">
                We did not find an active YouTube channel associated with this Google account. Please create a channel on YouTube or switch accounts.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fetchChannels()}
                className="px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover text-[#080808] font-semibold text-xs transition-colors"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onSignOut}
                className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] text-white text-xs font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* 4. CHANNELS LIST (1 or more channels) */}
        {!isLoadingChannels && !channelError && channels.length > 0 && (
          <div className="w-full flex flex-col gap-3 mb-8 text-left">
            {channels.map((ch) => {
              const isSelected = ch.channelId === activeChannelId;
              return (
                <div
                  key={ch.channelId}
                  id={`channel-card-${ch.channelId}`}
                  onClick={() => handleCardClick(ch.channelId)}
                  className={`relative p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                    isSelected
                      ? 'border-brand ring-1 ring-brand bg-brand-muted/10 shadow-[0_0_20px_rgba(249,115,22,0.18)]'
                      : 'bg-surface border-border hover:border-[#383838] hover:bg-surface-hover'
                  }`}
                >
                  {/* Channel Thumbnail */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#2a2a2a] shrink-0 flex items-center justify-center font-bold text-white text-base">
                    {ch.avatarUrl ? (
                      <img
                        src={ch.avatarUrl}
                        alt={ch.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      ch.title[0]?.toUpperCase() || 'Y'
                    )}
                  </div>

                  {/* Channel Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white truncate">{ch.title}</span>
                      {ch.subscriberCount && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-secondary shrink-0">
                          <Users className="w-3 h-3 text-brand" />
                          {ch.subscriberCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#71717a] font-mono truncate mt-0.5">
                      {ch.handle}
                    </div>
                    <div className="text-[11px] text-text-muted font-mono mt-0.5">
                      ID: {ch.channelId}
                    </div>
                  </div>

                  {/* Radio / Selection Indicator */}
                  <div className="shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-brand border-brand text-[#080808] scale-105'
                          : 'border-[#383838] bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Confirm Button */}
            <button
              id="btn-confirm-channel"
              type="button"
              onClick={handleConfirm}
              disabled={!selectedChannel || isSubmitting}
              aria-label={
                selectedChannel
                  ? `Continue as ${selectedChannel.title} ->`
                  : 'Select a Channel to Continue'
              }
              className="group w-full h-12 rounded-lg bg-brand text-[#080808] font-semibold text-base
                         flex items-center justify-center gap-2 hover:bg-brand-hover transition-all duration-150
                         shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]
                         disabled:opacity-40 disabled:hover:bg-brand disabled:cursor-not-allowed disabled:shadow-none mt-4
                         focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#080808]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting Channel...</span>
                </>
              ) : selectedChannel ? (
                <>
                  <span className="truncate max-w-[420px]">Continue as {selectedChannel.title}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </>
              ) : (
                <>
                  <span>Select a Channel to Continue</span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Logout Button */}
        <button
          onClick={onSignOut}
          type="button"
          className="text-xs text-[#71717a] hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Google Account</span>
        </button>
      </motion.div>
    </div>
  );
};
