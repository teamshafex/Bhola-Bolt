import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wrench, RefreshCw, ShieldAlert, Sparkles, Radio } from 'lucide-react';

interface MaintenanceOverlayProps {
  notice?: string | null;
  onCheckStatus?: () => Promise<void> | void;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  notice,
  onCheckStatus,
}) => {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      if (onCheckStatus) {
        await onCheckStatus();
      } else {
        window.location.reload();
      }
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  const defaultNotice =
    'Bhola Platform is currently undergoing scheduled platform upgrades. We will be back online shortly.';
  const displayNotice = notice?.trim() || defaultNotice;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Platform Maintenance Mode Active"
      className="fixed inset-0 z-[99999] bg-[#080808] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_70%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative max-w-lg w-full bg-[#111111]/90 backdrop-blur-xl border border-[#262626] rounded-2xl p-7 md:p-9 shadow-2xl shadow-black/80 flex flex-col items-center space-y-6"
      >
        {/* Animated Status Icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <Wrench className="w-10 h-10 text-amber-400 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#111111]" />
          </span>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold tracking-wide uppercase font-mono">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Scheduled Platform Maintenance</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#fafafa] tracking-tight">
            Co-Host Engine Upgrading
          </h1>
          <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-md">
            Streamer chat controls, automated banter inference, and dashboard actions are temporarily paused to ensure state integrity during database &amp; AI model migrations.
          </p>
        </div>

        {/* Custom Notice Card */}
        <div className="w-full bg-[#18181b] border border-[#27272a] rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Platform Operations Notice</span>
          </div>
          <p className="text-xs md:text-sm text-[#f4f4f5] leading-relaxed font-medium">
            &ldquo;{displayNotice}&rdquo;
          </p>
        </div>

        {/* Preserved Data Notice */}
        <div className="flex items-center gap-2 text-[11px] text-[#71717a]">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Your token balances, subscriber matrix, and persona configs remain 100% secure.</span>
        </div>

        {/* Action Controls */}
        <div className="pt-2 w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check If Online'}</span>
          </button>
        </div>

        {/* Footer Brand */}
        <div className="pt-2 border-t border-[#262626] w-full text-center">
          <span className="text-[10px] text-[#52525b] font-mono tracking-wider uppercase">
            Bhola 2.0 &bull; Super-Admin Maintenance Lockout
          </span>
        </div>
      </motion.div>
    </div>
  );
};
