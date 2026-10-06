import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  History,
  Settings,
  LogOut,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavTab } from '../types';
import { SubscriptionTier } from '@bhola/database';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  botEnabled: boolean;
  onLogout?: () => void;
  channelName?: string;
  channelHandle?: string;
  channelId?: string;
  avatarInitial?: string;
  avatarUrl?: string | null;
  subscriptionTier?: SubscriptionTier;
  onOpenPricing?: () => void;
  isPricingOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  botEnabled,
  onLogout,
  channelName: propChannelName,
  channelHandle: propChannelHandle,
  channelId: propChannelId,
  avatarInitial: propAvatarInitial,
  avatarUrl: propAvatarUrl,
  subscriptionTier = 'starter',
  onOpenPricing,
  isPricingOpen = false,
}) => {
  // Read cached channel from localStorage on every render pass.
  // useMemo with [] would be stale — the cache is written AFTER mount by AuthContext's
  // async handleSession. By reading inline, we always pick up the latest written value
  // when the parent re-renders with fresh tenant data.
  const cached = (() => {
    try {
      const raw = localStorage.getItem('bhola_cached_channel');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const channelName = propChannelName || cached?.name || 'Streamer';
  const channelHandle = propChannelHandle || cached?.handle || '@channel';
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

  const tierConfig = {
    starter: {
      label: 'Starter',
      pill: 'text-zinc-300 bg-zinc-800/80 border-zinc-700/60',
      icon: '✦',
      starColor: 'text-zinc-400',
    },
    pro: {
      label: 'Pro Creator',
      pill: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      icon: '⚡',
      starColor: 'text-orange-400',
    },
    studio: {
      label: 'Studio',
      pill: 'text-indigo-300 bg-indigo-950/60 border-indigo-500/30',
      icon: '★',
      starColor: 'text-indigo-400',
    },
    enterprise: {
      label: 'Enterprise',
      pill: 'text-amber-300 bg-amber-950/60 border-amber-500/30',
      icon: '★',
      starColor: 'text-amber-400',
    },
  }[subscriptionTier || 'starter'] || {
    label: 'Starter',
    pill: 'text-zinc-300 bg-zinc-800/80 border-zinc-700/60',
    icon: '✦',
    starColor: 'text-zinc-400',
  };

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (channelId) {
      navigator.clipboard?.writeText(channelId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'personas', label: 'Persona Hub', icon: Sparkles },
    { id: 'audience', label: 'Audience Matrix', icon: Users },
    { id: 'history', label: 'Session History', icon: History },
    { id: 'pricing', label: 'Plans & Pricing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden lg:flex flex-col w-[260px] h-screen bg-[#111111] border-r border-[#1a1a1a] fixed left-0 top-0 z-50 select-none"
    >
      {/* Top Logo Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#f97316] rounded-xs shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
          <span className="font-black text-xl tracking-tighter text-[#fafafa]">BHOLA</span>
        </div>
        <div className="w-full h-px bg-[#1a1a1a] mt-4" />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 mt-2 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'pricing' ? isPricingOpen : currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => {
                if (item.id === 'pricing') {
                  onOpenPricing?.();
                } else {
                  onTabChange(item.id);
                }
              }}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-left cursor-pointer
                ${
                  isActive
                    ? 'bg-[#1c0a00] text-[#f97316] border-l-2 border-[#f97316] rounded-l-none'
                    : 'text-[#a1a1aa] hover:bg-white/5 hover:text-[#fafafa]'
                }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#f97316]' : 'text-[#a1a1aa]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-[#1a1a1a]">
        {/* Upper Element — Bot Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              botEnabled
                ? 'bg-[#22c55e] animate-live-pulse'
                : 'bg-[#ef4444]'
            }`}
          />
          <span className="text-xs text-[#a1a1aa] font-medium">
            {botEnabled ? 'Bot Connected' : 'Bot Offline'}
          </span>
        </div>

        {/* Lower Element — Interactive Profile Dropdown Menu */}
        <div ref={menuRef} className="relative mt-3 pt-3 border-t border-[#1a1a1a]/60">
          {/* Dropdown Menu Popover */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                id="sidebar-profile-menu"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 w-[240px] mb-2 bg-[#18181b]/95 backdrop-blur-md border border-[#27272a] rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-left"
              >
                {/* Header Section: Streamer Name, Handle, Copy Channel ID & Current Plan Pill */}
                <div className="p-2.5 bg-[#202024] rounded-lg mb-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#2e2e33] flex items-center justify-center text-xs font-bold text-[#f97316] shrink-0">
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
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate" title={channelName}>
                        {channelName}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">
                        {channelHandle}
                      </div>
                    </div>
                    {channelId && (
                      <button
                        id="btn-sidebar-copy-channel-id"
                        onClick={handleCopyId}
                        title={`Copy Channel ID (${channelId})`}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Current Plan Pill: ★ Enterprise / Studio / Pro / Starter */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                    <span className="text-[10px] font-medium text-zinc-400">Current Plan</span>
                    <span
                      id="badge-profile-current-plan"
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${tierConfig.pill}`}
                    >
                      <span className={tierConfig.starColor}>{tierConfig.icon}</span>
                      <span>{tierConfig.label}</span>
                    </span>
                  </div>
                </div>

                {/* Menu Links */}
                {/* 1: Channel Settings */}
                <button
                  id="menu-item-channel-settings"
                  onClick={() => {
                    setMenuOpen(false);
                    onTabChange('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Channel Settings</span>
                </button>

                {/* 2: Billing & Plans */}
                <button
                  id="menu-item-billing-plans"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenPricing?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#3b82f6]" />
                  <span>Billing &amp; Plans</span>
                </button>

                {/* Divider Line */}
                <div className="h-px bg-[#27272a] my-1" />

                {/* Danger / Exit Action */}
                <button
                  id="menu-item-logout"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left group"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-400 transition-colors" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trigger Card */}
          <button
            id="sidebar-profile-trigger"
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-zinc-700"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#262626] flex items-center justify-center text-xs font-bold text-[#f97316] shrink-0">
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
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-[#fafafa] truncate">
                  {channelName}
                </div>
                <div className="text-[10px] text-[#71717a] font-mono truncate">
                  {channelHandle}
                </div>
              </div>
            </div>

            <ChevronUp
              className={`w-4 h-4 text-[#71717a] transition-transform duration-200 shrink-0 ${
                menuOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
};
