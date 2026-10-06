import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquareText,
  Trash2,
  Crown,
  Zap,
  Flame,
  User,
  Shield,
  Heart,
  ChevronDown,
  Loader2,
  ArrowRight,
  Radio,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Persona, StreamStatus, ChatterRole } from '../../types';
import { ROLE_CONFIG, getRoleMeta } from '../../data/constants';
import {
  fetchAudienceRoles,
  AudienceRole,
  normalizeAudienceRoleId,
  getPersonaQuotaExhaustionMessage,
} from '@bhola/database';

export type TestChatRole = string;

export interface TestChatMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  chatterName: string;
  role: ChatterRole;
  text: string;
  avatarUrl?: string | null;
  isSimulated?: boolean;
  isQuotaExhausted?: boolean;
  showUpgradeCta?: boolean;
}

interface LiveFeedPanelProps {
  streamStatus: StreamStatus;
  botEnabled: boolean;
  activePersona: Persona;
  onSimulateBanter: (
    message: string,
    role: string
  ) => Promise<{
    success: boolean;
    botReply?: string;
    tokensUsed?: number;
    quota?: any;
    error?: string;
    message?: string;
  }>;
  onClearFeed?: () => void;
  subscriptionTier?: any;
  tenantId?: string;
  onOpenPricing?: () => void;
}

const ROLES: { id: TestChatRole; label: string; icon: any; colorClass: string; badgeClass: string }[] = [
  {
    id: 'Regular',
    label: 'Regular',
    icon: User,
    colorClass: 'text-zinc-300',
    badgeClass: 'bg-zinc-800 border-zinc-700 text-zinc-300',
  },
  {
    id: 'VIP',
    label: 'VIP',
    icon: Zap,
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  {
    id: 'Troll',
    label: 'Troll',
    icon: Flame,
    colorClass: 'text-red-400',
    badgeClass: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  {
    id: 'Female',
    label: 'Female',
    icon: Heart,
    colorClass: 'text-pink-400',
    badgeClass: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  },
  {
    id: 'Mod',
    label: 'Mod',
    icon: Shield,
    colorClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  },
  {
    id: 'Streamer',
    label: 'Streamer',
    icon: Crown,
    colorClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  },
];

const getInitialWelcome = (persona: Persona): TestChatMessage => {
  const pName = persona.name || 'Co-Host';
  const pId = (persona.id || '').toLowerCase();
  let text = 'Stream offline hai! Yahan kuch bhi bol kar mera humor aur response test kar lo. 🌚';

  const isBandya = pId.includes('band') || pName.toLowerCase().includes('band');
  const isBabu = pId.includes('babu') || pName.toLowerCase().includes('babu');
  const isBhola = pId.includes('bhola') || pName.toLowerCase().includes('bhola');

  if (isBandya) {
    text = 'Maalik! Stream offline hai, yahan kuch bhi bol kar test kar lo... waise bhi udhar chukta karna baqi hai aapka! 😩';
  } else if (isBabu) {
    text = 'Arey baba stream offline hai! Yahan pehle practice kar lo, par superchat bhejte rehna! 😆';
  } else if (isBhola) {
    text = 'Oye hero! Stream offline hai, yahan chat mein test kar le Bhola ka comeback! 🌚🔥';
  }

  const avatar =
    persona.avatar_url ||
    persona.avatarUrl ||
    (isBandya
      ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
      : isBabu
      ? 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj'
      : 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj');

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    id: `welcome_${Date.now()}`,
    sender: 'bot',
    timestamp: timeStr,
    chatterName: isBandya ? 'Bandya' : isBabu ? 'Babu Rao' : pName,
    role: 'regular',
    text,
    avatarUrl: avatar,
    isSimulated: true,
  };
};

export const LiveFeedPanel: React.FC<LiveFeedPanelProps> = ({
  streamStatus,
  botEnabled,
  activePersona,
  onSimulateBanter,
  onClearFeed,
  subscriptionTier = 'starter',
  tenantId,
  onOpenPricing,
}) => {
  const [feedMessages, setFeedMessages] = useState<TestChatMessage[]>(() => [
    getInitialWelcome(activePersona),
  ]);
  const [dynamicRoles, setDynamicRoles] = useState<AudienceRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<TestChatRole>('Regular');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);

  // Check simulator quota on mount and when subscription tier or tenant changes
  useEffect(() => {
    let isMounted = true;
    async function checkQuota() {
      if (!tenantId) return;
      try {
        const res = await fetch(`/api/streamer/daily-quota?tenantId=${encodeURIComponent(tenantId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.quota?.simulator) {
            const sim = data.quota.simulator;
            const exhausted = sim.limit !== -1 && sim.remaining <= 0;
            setIsQuotaExhausted(exhausted);
          }
        }
      } catch {
        // Graceful offline fallback
      }
    }
    checkQuota();
    return () => {
      isMounted = false;
    };
  }, [tenantId, subscriptionTier]);

  // Load active audience roles dynamically from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const roles = await fetchAudienceRoles(false);
        if (isMounted && roles && roles.length > 0) {
          setDynamicRoles(roles);
          const defaultRole = roles.find((r) => r.id === 'regular_buddy' || r.id === 'general_viewer') || roles[0];
          if (defaultRole) {
            setSelectedRole(defaultRole.label);
          }
        }
      } catch (err) {
        console.warn('Failed loading audience roles in LiveFeedPanel:', err);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize initial welcome message whenever activePersona changes or loads
  useEffect(() => {
    setFeedMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith('welcome_')) {
        return [getInitialWelcome(activePersona)];
      }
      return prev;
    });
  }, [activePersona.id, activePersona.name, activePersona.avatar_url, activePersona.avatarUrl]);

  const isLive = streamStatus === 'live' || streamStatus === 'premiere';

  // Auto-scroll on new message or when bot is typing
  useEffect(() => {
    if (!autoScroll || !feedContainerRef.current) return;
    feedContainerRef.current.scrollTo({
      top: feedContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [feedMessages, isBotTyping, autoScroll]);

  // Close role dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isRoleDropdownOpen]);

  const effectiveTestRoles = useMemo(() => {
    if (dynamicRoles.length > 0) {
      return dynamicRoles.map((r) => ({
        id: r.id,
        label: r.label,
        color: r.color || '#71717a',
      }));
    }
    return [
      { id: 'regular_buddy', label: 'Regular', color: '#a1a1aa' },
      { id: 'vip_superchatter', label: 'VIP', color: '#eab308' },
      { id: 'troll', label: 'Troll', color: '#ef4444' },
      { id: 'female_viewer', label: 'Female', color: '#ec4899' },
      { id: 'mod_male', label: 'Mod', color: '#6366f1' },
      { id: 'streamer', label: 'Streamer', color: '#f97316' },
    ];
  }, [dynamicRoles]);

  const currentRoleItem =
    effectiveTestRoles.find(
      (r) =>
        r.label === selectedRole ||
        r.id === selectedRole ||
        r.label.toLowerCase() === selectedRole.toLowerCase()
    ) || effectiveTestRoles[0];

  const handleClearChat = () => {
    setFeedMessages([]);
    onClearFeed?.();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isBotTyping || isQuotaExhausted) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const senderName = `You (${currentRoleItem?.label || selectedRole})`;

    const userMsg: TestChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      timestamp: timeStr,
      chatterName: senderName,
      role: (currentRoleItem?.id || 'regular_buddy') as ChatterRole,
      text,
      isSimulated: true,
    };

    setFeedMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsBotTyping(true);

    const pName = activePersona.name || 'Co-Host';
    const pId = (activePersona.id || '').toLowerCase();
    const isBandya = pId.includes('band') || pName.toLowerCase().includes('band');
    const isBabu = pId.includes('babu') || pName.toLowerCase().includes('babu');
    const fallbackAvatar = isBandya
      ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
      : isBabu
      ? 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj'
      : 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj';

    try {
      const result = await onSimulateBanter(text, currentRoleItem?.id || selectedRole);

      if (result?.success && result.botReply) {
        const botMsg: TestChatMessage = {
          id: `msg_bot_${Date.now() + 1}`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chatterName: isBandya ? 'Bandya' : isBabu ? 'Babu Rao' : pName,
          role: 'regular',
          text: result.botReply,
          avatarUrl: activePersona.avatar_url || activePersona.avatarUrl || fallbackAvatar,
          isSimulated: true,
        };
        setFeedMessages((prev) => [...prev, botMsg]);

        // Check if simulator quota is now exhausted after this reply
        if (result.quota?.simulator && result.quota.simulator.limit !== -1 && result.quota.simulator.remaining <= 0) {
          setIsQuotaExhausted(true);
        }
      } else if (
        result?.error === 'DAILY_SIMULATOR_QUOTA_EXHAUSTED' ||
        result?.error === 'DAILY_LIMIT_REACHED' ||
        (result?.quota?.simulator && result.quota.simulator.limit !== -1 && result.quota.simulator.remaining <= 0)
      ) {
        setIsQuotaExhausted(true);
        const quotaText = result?.message || getPersonaQuotaExhaustionMessage(activePersona);
        const quotaMsg: TestChatMessage = {
          id: `msg_quota_${Date.now() + 1}`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chatterName: isBandya ? 'Bandya' : isBabu ? 'Babu Rao' : pName,
          role: 'regular',
          text: quotaText,
          avatarUrl: activePersona.avatar_url || activePersona.avatarUrl || fallbackAvatar,
          isSimulated: true,
          isQuotaExhausted: true,
          showUpgradeCta: true,
        };
        setFeedMessages((prev) => [...prev, quotaMsg]);
      }
    } catch (err: any) {
      console.error('Failed inline test chat message:', err);
      const isQuotaErr = err?.status === 429 || err?.message?.includes('DAILY_SIMULATOR_QUOTA_EXHAUSTED');
      if (isQuotaErr) {
        setIsQuotaExhausted(true);
        const quotaText = getPersonaQuotaExhaustionMessage(activePersona);
        const quotaMsg: TestChatMessage = {
          id: `msg_quota_${Date.now() + 1}`,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chatterName: isBandya ? 'Bandya' : isBabu ? 'Babu Rao' : pName,
          role: 'regular',
          text: quotaText,
          avatarUrl: activePersona.avatar_url || activePersona.avatarUrl || fallbackAvatar,
          isSimulated: true,
          isQuotaExhausted: true,
          showUpgradeCta: true,
        };
        setFeedMessages((prev) => [...prev, quotaMsg]);
      }
    } finally {
      setIsBotTyping(false);
      inputRef.current?.focus();
    }
  };

  const renderRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'streamer':
        return <Crown className="w-2.5 h-2.5 shrink-0" />;
      case 'vip':
        return <Zap className="w-2.5 h-2.5 shrink-0" />;
      case 'troll':
        return <Flame className="w-2.5 h-2.5 shrink-0" />;
      case 'mod':
        return <Shield className="w-2.5 h-2.5 shrink-0" />;
      case 'female':
        return <Heart className="w-2.5 h-2.5 shrink-0" />;
      default:
        return <User className="w-2.5 h-2.5 shrink-0" />;
    }
  };

  const currentRoleObj = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const CurrentRoleIcon = currentRoleObj.icon;
  const botHandle = activePersona.handle?.replace(/^@/, '') || 'BholaAI';

  return (
    <div
      id="panel-live-bot-feed"
      className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden shadow-lg flex flex-col"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <MessageSquareText className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
            LIVE BOT FEED
          </span>
          {isLive && botEnabled ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[#f97316]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-live-pulse" />
              <span>Live Chat</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Test Mode • Offline</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-scroll toggle */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#52525b]">Auto-scroll</span>
            <button
              id="btn-feed-autoscroll"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`w-8 h-4 rounded-full p-0.5 transition-colors ${
                autoScroll ? 'bg-[#f97316]' : 'bg-[#262626]'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-[#fafafa] transform transition-transform ${
                  autoScroll ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Clear Chat button */}
          <button
            id="btn-clear-feed"
            onClick={handleClearChat}
            title="Clear Feed Chat"
            className="flex items-center gap-1 text-[11px] text-[#52525b] hover:text-[#ef4444] transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Feed Conversation Container */}
      <div
        ref={feedContainerRef}
        className="flex-1 min-h-[320px] max-h-[520px] overflow-y-auto flex flex-col divide-y divide-[#1a1a1a]/60 bg-[#0c0c0c]"
      >
        {feedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none">
            {isQuotaExhausted ? (
              <>
                <Zap className="w-8 h-8 text-orange-500/50 stroke-1 mb-2" />
                <p className="text-xs text-orange-400 font-medium">Daily simulator limit reached</p>
                <p className="text-[11px] text-[#52525b] mt-0.5 max-w-xs text-center">
                  Upgrade your plan to unlock more daily test messages and higher co-host limits.
                </p>
                {onOpenPricing && (
                  <button
                    type="button"
                    onClick={onOpenPricing}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f97316] hover:bg-[#ea580c] text-black shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black text-black" />
                    <span>Upgrade Plan</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <Radio className="w-8 h-8 text-[#262626] stroke-1 mb-2" />
                <p className="text-xs text-[#52525b] font-medium">Chat is quiet</p>
                <p className="text-[11px] text-[#3f3f46] mt-0.5">
                  Type a mock message below to test how {activePersona.name} responds!
                </p>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {feedMessages.map((msg) => {
              const roleMeta = getRoleMeta(msg.role, dynamicRoles);
              const isBot = msg.sender === 'bot';

              // Ensure avatar accurately matches the specific bot sender (Bandya, Babu Rao, Bhola)
              const isMsgBandya = (msg.chatterName || '').toLowerCase().includes('band');
              const isMsgBabu = (msg.chatterName || '').toLowerCase().includes('babu');
              const isMsgBhola = (msg.chatterName || '').toLowerCase().includes('bhola');

              const botAvatar =
                msg.avatarUrl ||
                (isMsgBandya
                  ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
                  : isMsgBabu
                  ? 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj'
                  : isMsgBhola
                  ? 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj'
                  : activePersona.avatar_url || activePersona.avatarUrl || null);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`px-4 py-2.5 flex gap-3 items-start transition-colors ${
                    msg.isQuotaExhausted
                      ? 'bg-orange-500/[0.08] border-y border-orange-500/25'
                      : isBot
                      ? 'bg-[#121212]/80 hover:bg-[#161616]'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Avatar / Accent */}
                  {isBot ? (
                    <div className="relative shrink-0 mt-0.5">
                      {botAvatar ? (
                        <img
                          src={botAvatar}
                          alt={msg.chatterName || activePersona.name}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-7 h-7 rounded-full object-cover border border-orange-500/40"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                            const parent = (e.target as HTMLElement).parentElement;
                            const fallbackEl = parent?.querySelector('.bot-avatar-fallback') as HTMLElement;
                            if (fallbackEl) fallbackEl.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="bot-avatar-fallback w-7 h-7 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-orange-500/40 items-center justify-center font-bold text-[10px] text-orange-400 select-none"
                        style={{ display: botAvatar ? 'none' : 'flex' }}
                      >
                        {(msg.chatterName || activePersona.name || 'B').charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[#0c0c0c]" />
                    </div>
                  ) : (
                    <div
                      className="w-0.5 min-h-[36px] rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: roleMeta.color }}
                    />
                  )}

                  {/* Message Content */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isBot ? 'text-orange-400' : 'text-[#fafafa]'
                        }`}
                      >
                        {msg.chatterName}
                      </span>

                      {/* Role Pill */}
                      {isBot ? (
                        msg.isQuotaExhausted ? (
                          <span className="rounded-full px-1.5 py-0.2 text-[9px] font-semibold inline-flex items-center gap-1 border bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-xs">
                            <Zap className="w-2.5 h-2.5 shrink-0 fill-amber-400 text-amber-400" />
                            <span>Quota Exhausted</span>
                          </span>
                        ) : (
                          <span className="rounded-full px-1.5 py-0.2 text-[9px] font-semibold inline-flex items-center gap-1 border bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-xs">
                            <Sparkles className="w-2.5 h-2.5 shrink-0 text-orange-400" />
                            <span>AI Co-Host</span>
                          </span>
                        )
                      ) : (
                        <span
                          className="rounded-full px-1.5 py-0.2 text-[9px] font-medium inline-flex items-center gap-1 border"
                          style={{
                            backgroundColor: roleMeta.bgSubtle,
                            borderColor: roleMeta.border,
                            color: roleMeta.color,
                          }}
                        >
                          {renderRoleIcon(msg.role)}
                          <span>{roleMeta.label}</span>
                        </span>
                      )}

                      {/* Timestamp & Simulated Pill */}
                      <div className="font-mono text-[10px] text-[#52525b] ml-auto flex items-center gap-1.5">
                        <span>{msg.timestamp}</span>
                        {msg.isSimulated && (
                          <span className="font-mono text-[8px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30">
                            TEST
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-xs md:text-sm leading-relaxed break-words mt-0.5 ${
                        isBot ? 'text-[#fafafa] font-medium' : 'text-zinc-300'
                      }`}
                    >
                      {msg.text}
                    </p>

                    {/* Inline Upgrade CTA Button for Quota Exhaustion */}
                    {msg.showUpgradeCta && onOpenPricing && (
                      <div className="mt-2.5 pt-2 flex items-center justify-between gap-3 flex-wrap border-t border-orange-500/20">
                        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Daily limit reached
                        </span>
                        <button
                          type="button"
                          onClick={onOpenPricing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f97316] hover:bg-[#ea580c] text-black shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                          title="Upgrade plan to increase daily message limit"
                        >
                          <Zap className="w-3.5 h-3.5 fill-black text-black" />
                          <span>Upgrade Plan</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Bot Typing Indicator */}
        {isBotTyping && (
          <div className="px-4 py-2.5 flex items-center gap-3 bg-[#121212]/60 animate-in fade-in duration-150">
            <div className="relative w-7 h-7 shrink-0">
              {(activePersona.avatar_url || activePersona.avatarUrl) ? (
                <img
                  src={(activePersona.avatar_url || activePersona.avatarUrl)!}
                  alt={activePersona.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-7 h-7 rounded-full object-cover border border-orange-500/40"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-7 h-7 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-orange-500/40 items-center justify-center font-bold text-[10px] text-orange-400 select-none ${
                  (activePersona.avatar_url || activePersona.avatarUrl) ? 'hidden' : 'flex'
                }`}
              >
                {(activePersona.name || 'B').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <span className="text-orange-400 font-semibold">{activePersona.name}</span>
              <span>is typing</span>
              <span className="inline-flex gap-1 items-center ml-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Inline Test Chat Input Strip */}
      <div className="p-2.5 sm:p-3 border-t border-[#1a1a1a] bg-[#111111] flex items-center gap-2 relative">
        {/* Compact Role Selector Pill */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            disabled={isQuotaExhausted}
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="bg-zinc-800 hover:bg-zinc-700/80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-zinc-300 rounded-lg px-2.5 py-2 border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isQuotaExhausted ? 'Daily limit reached' : 'Choose mock role for testing'}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: currentRoleItem?.color || '#a1a1aa' }}
            />
            <span className="text-xs truncate max-w-[100px]">{currentRoleItem?.label || selectedRole}</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute bottom-11 left-0 bg-[#18181b] border border-[#27272a] rounded-xl p-1.5 shadow-2xl z-30 w-44 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
              <p className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 px-2 py-1">
                Mock Viewer Role
              </p>
              {effectiveTestRoles.map((r) => {
                const isSelected = selectedRole === r.label || selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.label);
                      setIsRoleDropdownOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500/10 text-orange-400 font-semibold'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Text Input Bar */}
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isBotTyping || isQuotaExhausted}
            placeholder={
              isQuotaExhausted
                ? 'Daily simulator limit reached — upgrade to unlock more'
                : `Send a test message as [${selectedRole}] to ${activePersona.name}... (Press Enter)`
            }
            className={`flex-1 bg-[#18181b] border rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#fafafa] placeholder-zinc-500 outline-none transition-colors min-w-0 ${
              isQuotaExhausted
                ? 'border-orange-500/30 bg-orange-500/[0.04] text-zinc-400 cursor-not-allowed placeholder-orange-400/60'
                : 'border-[#262626] focus:border-[#f97316] disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          />

          {/* Send Arrow Button */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || isBotTyping || isQuotaExhausted}
            className="w-9 h-9 rounded-xl bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 disabled:hover:bg-[#f97316] text-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 font-semibold shadow-md shadow-orange-500/10 active:scale-95"
            title={isQuotaExhausted ? 'Daily limit reached' : 'Send test message (Enter)'}
          >
            {isBotTyping ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <ArrowRight className="w-4 h-4 text-black stroke-[2.5]" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
