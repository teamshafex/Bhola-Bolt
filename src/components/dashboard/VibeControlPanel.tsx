import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, X, ChevronDown, ChevronUp, Lock, AlertTriangle, ShieldAlert, AlertCircle } from 'lucide-react';
import { SubscriptionTier, AmbientFrequency } from '@bhola/database';

// VibeControlPanel is a FULLY CONTROLLED component.
// All state (roastIntensity, ambientFreq, customSlangs) lives in the parent hook
// (useStreamerState) which is the single source of truth loaded from Supabase on mount.
// This panel ONLY reads from props and delegates changes back to parent handlers.
// DO NOT re-introduce internal Supabase fetches or local state mirrors here —
// doing so creates a dual-ownership race condition that causes settings to not persist.

export interface VibeControlPanelProps {
  roastIntensity: number;
  onChangeIntensity: (val: number) => void;
  ambientFreq: AmbientFrequency;
  onChangeFreq: (val: AmbientFrequency) => void;
  slangs: string[];
  onAddSlang: (slang: string) => void;
  onRemoveSlang: (slang: string) => void;
  onResetDefaults?: () => void;
  onClearSlangs?: () => void;
  onPurgeDirtySlangs?: () => void;
  subscriptionTier?: SubscriptionTier;
  onOpenPricing?: () => void;
  activePersonaName?: string;
  tenantId?: string | null;
  showToast?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const VibeControlPanel: React.FC<VibeControlPanelProps> = ({
  roastIntensity,
  onChangeIntensity,
  ambientFreq,
  onChangeFreq,
  slangs,
  onAddSlang,
  onRemoveSlang,
  onResetDefaults,
  onClearSlangs,
  onPurgeDirtySlangs,
  subscriptionTier = 'starter',
  onOpenPricing,
  activePersonaName = 'Bandya',
  tenantId,
  showToast,
}) => {
  // UI-only local state (no Supabase involvement)
  const [newSlang, setNewSlang] = useState('');
  const [isCollapsedOnMobile, setIsCollapsedOnMobile] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [slangFeedback, setSlangFeedback] = useState<{
    type: 'BLOCKED' | 'SUSPICIOUS';
    flaggedSlang: string;
    reason?: string;
  } | null>(null);

  // Prohibited terms regex for local UI detection & defense-in-depth
  const PROHIBITED_REGEX = /\b(bc|mc|bhenchod|behenchod|behnchod|bhnchod|madarchod|maderchod|chutiya|chootiya|bhosdike|bhosadi|bhosadike|gaandu|gandu|lodu|lauda|lund|chut|gaand|harami|kutte|kutta)\b/i;
  const dirtySlangs = slangs.filter((s) => PROHIBITED_REGEX.test(s.trim()));

  // UI Handlers — delegate all state mutations to parent (useStreamerState)
  const handleIntensityChange = (val: number) => {
    onChangeIntensity(val);
  };

  const handleFrequencyChange = (val: AmbientFrequency) => {
    // Cleanly map 'Off' to 'Mentions Only' for database constraint compatibility
    const sanitizedVal: AmbientFrequency = val === 'Off' ? 'Mentions Only' : val;
    onChangeFreq(sanitizedVal);
  };

  // Validate a single slang against the profanity guardrail before adding
  const validateAndAddSlang = async (slangToAdd: string) => {
    const trimmed = slangToAdd.trim().toLowerCase();
    if (!trimmed || slangs.includes(trimmed)) return;

    setIsValidating(true);
    setSlangFeedback(null);

    let res: Response | null = null;
    try {
      res = await fetch('/api/streamer/validate-slangs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slangs: [trimmed],
          tenantId: tenantId || 'unknown',
        }),
      });
    } catch (netErr) {
      console.error('[VibeControlPanel] Network error during slang validation:', netErr);
      setIsValidating(false);
      setNewSlang('');
      if (showToast) {
        showToast('error', 'Safety check service unavailable. Could not verify slang.');
      }
      return;
    }

    setIsValidating(false);

    // BLOCK ON FAILURE: If response.status !== 200 or !response.ok (e.g. 404, 500, network error):
    // DO NOT PROCEED TO SAVE! Abort update, drop slang, and display error toast.
    if (!res || !res.ok || res.status !== 200) {
      console.error('[VibeControlPanel] Slang validation service failure:', res?.status);
      setNewSlang('');
      if (showToast) {
        showToast('error', 'Safety check service unavailable. Could not verify slang.');
      }
      return;
    }

    let data: any = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error('[VibeControlPanel] Failed to parse validation response:', parseErr);
      setNewSlang('');
      if (showToast) {
        showToast('error', 'Safety check service unavailable. Could not verify slang.');
      }
      return;
    }

    const verdict = data?.verdict || (!data?.valid ? 'BLOCKED' : 'ALLOWED');

    if (verdict === 'BLOCKED') {
      // Hard block — DO NOT call onAddSlang / saveBotConfig / triggerVibeAutoSave!
      // If already in slangs, remove it
      if (slangs.includes(trimmed)) {
        onRemoveSlang(trimmed);
      }
      setSlangFeedback({
        type: 'BLOCKED',
        flaggedSlang: data?.flaggedTerm || data?.flaggedSlang || trimmed,
        reason: 'Prohibited by YouTube Community Guidelines (Abusive/Vulgar Content).',
      });
      setNewSlang('');
      return;
    }

    if (verdict === 'SUSPICIOUS') {
      // Borderline term — allow save but show administrative review notice
      setSlangFeedback({
        type: 'SUSPICIOUS',
        flaggedSlang: data?.flaggedTerm || data?.flaggedSlang || trimmed,
        reason: data?.reason || 'Flagged for administrative review.',
      });
      onAddSlang(trimmed);
      setNewSlang('');
      return;
    }

    // Clean (ALLOWED) — add slang smoothly
    setSlangFeedback(null);
    onAddSlang(trimmed);
    setNewSlang('');
  };

  const handleAddSlangInternal = () => {
    validateAndAddSlang(newSlang);
  };

  const handleRemoveSlangInternal = (slangToRemove: string) => {
    onRemoveSlang(slangToRemove);
  };

  const handleClearAllInternal = () => {
    if (onClearSlangs) {
      onClearSlangs();
    } else if (onResetDefaults) {
      onResetDefaults();
    } else {
      slangs.forEach((slang) => onRemoveSlang(slang));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSlang.trim()) {
      e.preventDefault();
      handleAddSlangInternal();
    }
  };

  const getIntensityLabel = (val: number) => {
    if (val <= 3) return 'Light Banter';
    if (val <= 6) return 'Balanced Roast';
    if (val <= 8) return 'Hardcore';
    return 'Savage Mode';
  };

  // Calculate percentage for range track fill
  const fillPercentage = ((roastIntensity - 1) / (10 - 1)) * 100;

  return (
    <div
      id="panel-vibe-control"
      className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden shadow-lg transition-all"
    >
      {/* Panel Header */}
      <div
        onClick={() => setIsCollapsedOnMobile(!isCollapsedOnMobile)}
        className="p-4 border-b border-[#1a1a1a] flex items-center justify-between cursor-pointer sm:cursor-default"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
            VIBE CONTROL
          </span>
        </div>
        <div className="sm:hidden text-[#52525b]">
          {isCollapsedOnMobile ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Panel Body */}
      <div className={`${isCollapsedOnMobile ? 'hidden sm:flex' : 'flex'} flex-col gap-6 p-6`}>
        {/* ROAST INTENSITY SLIDER */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#fafafa]">Roast Intensity</span>
            <span className="font-mono text-xs text-[#f97316] font-semibold">
              {roastIntensity} — {getIntensityLabel(roastIntensity)}
            </span>
          </div>

          <div className="relative py-2 flex items-center">
            <input
              id="input-roast-intensity"
              type="range"
              min={1}
              max={10}
              step={1}
              value={roastIntensity}
              onChange={(e) => handleIntensityChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f97316 0%, #f97316 ${fillPercentage}%, #262626 ${fillPercentage}%, #262626 100%)`,
              }}
            />
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-[#52525b]">1 — Light Banter</span>
            <span className="text-xs text-[#52525b]">10 — Savage Roast</span>
          </div>
        </div>

        {/* AMBIENT CHATTER FREQUENCY */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[#fafafa] flex items-center gap-2">
              <span>Ambient Frequency</span>
              {subscriptionTier === 'starter' && (
                <span
                  title="Requires Pro Creator plan"
                  onClick={onOpenPricing}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-500/20 transition-colors"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Pro Only</span>
                </span>
              )}
            </div>
            {subscriptionTier === 'starter' && (
              <button
                onClick={onOpenPricing}
                className="text-[11px] text-[#f97316] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>Unlock Ambient</span>
                <span>→</span>
              </button>
            )}
          </div>
          <div className="text-xs text-[#52525b] mt-0.5 mb-3">
            {subscriptionTier === 'starter'
              ? `Locked to Mentions Only on Starter tier. How often ${activePersonaName} jumps into chat unprompted.`
              : `How often ${activePersonaName} jumps into chat unprompted`}
          </div>

          <div
            className={`bg-[#1c1c1c] border border-[#262626] rounded-full p-1 inline-flex w-full ${
              subscriptionTier === 'starter' ? 'opacity-70' : ''
            }`}
          >
            {(['Mentions Only', 'Balanced', 'High'] as const).map((freq) => {
              const isFree = subscriptionTier === 'starter';
              const isOffActive = freq === 'Mentions Only' && (ambientFreq === 'Mentions Only' || ambientFreq === 'Off');
              const isBalancedActive = freq === 'Balanced' && (ambientFreq === 'Balanced' || ambientFreq === 'Medium' || ambientFreq === 'Low');
              const isHighActive = freq === 'High' && (ambientFreq === 'High' || ambientFreq === 'Extreme');
              const isActive = isFree ? (freq === 'Mentions Only') : (isOffActive || isBalancedActive || isHighActive);
              const isDisabled = isFree && freq !== 'Mentions Only';
              return (
                <button
                  key={freq}
                  id={`btn-freq-${freq.toLowerCase().replace(' ', '-')}`}
                  disabled={isDisabled}
                  onClick={() => !isFree && handleFrequencyChange(freq)}
                  title={isDisabled ? 'Requires Pro Creator plan' : undefined}
                  className={`flex-1 rounded-full text-xs py-1.5 transition-all duration-150 text-center font-medium ${
                    isDisabled ? 'cursor-not-allowed opacity-40 text-zinc-500' : ''
                  } ${
                    isActive
                      ? 'bg-[#f97316] text-[#080808] font-semibold shadow-xs'
                      : 'text-[#a1a1aa] hover:text-[#fafafa]'
                  }`}
                >
                  {freq}
                </button>
              );
            })}
          </div>
        </div>

        {/* CUSTOM SLANGS INPUT */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[#fafafa] flex items-center gap-2">
              <span>Custom Slangs</span>
              {subscriptionTier === 'starter' && (
                <span
                  title="Unlock custom slangs on Pro Creator"
                  onClick={onOpenPricing}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full cursor-pointer hover:bg-amber-500/20 transition-colors"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>Pro Only</span>
                </span>
              )}
            </div>
            {subscriptionTier === 'starter' ? (
              <div className="flex items-center gap-2">
                {slangs.length > 0 && (
                  <button
                    type="button"
                    id="btn-clear-slangs-header-starter"
                    onClick={handleClearAllInternal}
                    className="text-[11px] text-[#71717a] hover:text-[#ef4444] transition-colors cursor-pointer mr-1"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={onOpenPricing}
                  className="text-[11px] text-[#f97316] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>Upgrade to Add</span>
                  <span>→</span>
                </button>
              </div>
            ) : (
              slangs.length > 0 && (
                <button
                  type="button"
                  id="btn-clear-slangs-header"
                  onClick={handleClearAllInternal}
                  className="text-[11px] text-[#71717a] hover:text-[#ef4444] transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )
            )}
          </div>
          <div className="text-xs text-[#52525b] mt-0.5 mb-3">
            {subscriptionTier === 'starter'
              ? 'Custom slangs require Pro Creator.'
              : "Your channel's signature takiya-kalaam"}
          </div>

          {/* ⚠️ Prohibited / Dirty Slangs Detected Alert Banner & Purge Button */}
          {dirtySlangs.length > 0 && (
            <div className="mb-3 flex items-start justify-between gap-3 bg-[#260000] border border-[#ef4444] rounded-lg p-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#ef4444]">
                    Prohibited Slangs Detected ({dirtySlangs.length})
                  </p>
                  <p className="text-[11px] text-[#fca5a5] mt-0.5">
                    The following terms violate YouTube Community Guidelines: &ldquo;{dirtySlangs.join(', ')}&rdquo;. Purge them to prevent stream suspension.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onPurgeDirtySlangs) {
                    onPurgeDirtySlangs();
                  } else {
                    dirtySlangs.forEach((s) => onRemoveSlang(s));
                  }
                }}
                className="px-3 py-1 text-xs font-semibold bg-[#ef4444] text-white rounded hover:bg-[#dc2626] transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                Purge Dirty Slangs 🧹
              </button>
            </div>
          )}

          {/* ⚠️ YouTube Safety Guard Policy Warning Banner */}
          {subscriptionTier !== 'starter' && (
            <div className="mb-3 flex items-start gap-2.5 bg-[#1a0800] border border-[#ef4444]/40 rounded-lg px-3 py-2.5">
              <ShieldAlert className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#fca5a5] leading-relaxed">
                <span className="font-semibold text-[#ef4444]">⚠️ YouTube Safety Guard:</span>{' '}
                Do not add abusive terms, vulgar slurs, or hate speech. Bot channels are strictly monitored by YouTube automated systems. Violations will trigger account suspension.
              </p>
            </div>
          )}

          {/* AI Safety Guard Feedback Alert / Notice */}
          {slangFeedback && slangFeedback.type === 'BLOCKED' && (
            <div className="mb-3 flex items-center justify-between gap-2.5 bg-[#200000] border border-[#ef4444]/60 rounded-lg px-3 py-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />
                <p className="text-[11px] text-[#fca5a5] leading-normal">
                  <span className="font-semibold text-[#ef4444]">Blocked by AI Safety Guard:</span>{' '}
                  &ldquo;{slangFeedback.flaggedSlang}&rdquo; — Prohibited by YouTube Community Guidelines (Abusive/Vulgar Content).
                </p>
              </div>
              <button
                onClick={() => setSlangFeedback(null)}
                className="text-[#52525b] hover:text-[#fafafa] transition-colors cursor-pointer flex-shrink-0 p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {slangFeedback && slangFeedback.type === 'SUSPICIOUS' && (
            <div className="mb-3 flex items-center justify-between gap-2.5 bg-[#1f1700] border border-[#f59e0b]/60 rounded-lg px-3 py-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-[#f59e0b] flex-shrink-0" />
                <p className="text-[11px] text-[#fde68a] leading-normal">
                  <span className="font-semibold text-[#f59e0b]">Notice:</span>{' '}
                  &ldquo;{slangFeedback.flaggedSlang}&rdquo; added to your custom slangs, but flagged for review.
                </p>
              </div>
              <button
                onClick={() => setSlangFeedback(null)}
                className="text-[#52525b] hover:text-[#fafafa] transition-colors cursor-pointer flex-shrink-0 p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="bg-[#1c1c1c] border border-[#262626] rounded-lg p-3 min-h-[52px] flex flex-wrap gap-2 items-center">
            {slangs.map((slang) => {
              const isDirty = PROHIBITED_REGEX.test(slang.trim());
              return (
                <span
                  key={slang}
                  className={`rounded-full px-3 py-1 text-xs flex items-center gap-1.5 ${
                    isDirty
                      ? 'bg-[#3b0000] border border-[#ef4444] text-[#fca5a5]'
                      : 'bg-[#1c0a00] border border-[#f97316]/30 text-[#f97316]'
                  }`}
                >
                  <span>{slang}</span>
                  <button
                    onClick={() => handleRemoveSlangInternal(slang)}
                    className="hover:text-[#ea580c] transition-colors p-0.5 cursor-pointer"
                    title={`Remove ${slang}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}

            {subscriptionTier === 'starter' ? (
              <div
                title="Unlock custom slangs on Pro Creator"
                className="flex items-center gap-1.5 text-xs text-zinc-500 italic py-1 px-2 select-none"
              >
                <Lock className="w-3 h-3 text-amber-500/80" />
                <span>Unlock custom slangs on Pro Creator</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-[220px]">
                <input
                  id="input-new-slang"
                  type="text"
                  value={newSlang}
                  onChange={(e) => setNewSlang(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isValidating}
                  placeholder={isValidating ? 'Checking with YouTube Safety Guard...' : 'Add channel slang (e.g. OP bolte, Scene on hai, Chal bay)...'}
                  className="bg-transparent border-none outline-none text-xs text-[#fafafa] placeholder-[#52525b] w-full disabled:opacity-60"
                />
                {newSlang.trim() && !isValidating && (
                  <button
                    onClick={handleAddSlangInternal}
                    className="text-xs text-[#f97316] font-medium px-2 py-0.5 rounded hover:bg-[#1c0a00] cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                )}
                {isValidating && (
                  <span className="text-xs text-[#a1a1aa] font-medium shrink-0 animate-pulse">
                    Checking...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Helper Text */}
          <p className="text-xs text-text-muted text-[#52525b] mt-2">
            Tip: Add your channel&apos;s inside jokes or takiya-kalaam. Persona&apos;s own signature slangs are automatically active.
          </p>
        </div>

        {/* CLEAR ALL (Secondary action only shown if custom slangs exist) */}
        {slangs.length > 0 && (
          <div className="pt-2 border-t border-[#1a1a1a] flex justify-end">
            <button
              id="btn-clear-slangs"
              onClick={handleClearAllInternal}
              className="text-xs text-[#71717a] hover:text-[#ef4444] flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-[#262626]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All Custom Slangs</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
