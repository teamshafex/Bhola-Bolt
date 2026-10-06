import React, { useState, useMemo, useEffect } from 'react';
import {
  LogOut,
  Lock,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Check,
  Copy,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { Persona } from '../../types';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  updateTenant,
  fetchBotConfig,
  saveBotConfig,
} from '@bhola/database';
import { useAuth } from '../../context/AuthContext';

interface SettingsPageProps {
  activePersona: Persona;
  onChangePersona?: (p: Persona) => void;
  onNavigatePersonas: () => void;
  onDisconnectAccount: () => void;
  onClearHistory: () => void;
  onDeleteAccount: () => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  activePersona,
  onNavigatePersonas,
  onDisconnectAccount,
  onClearHistory,
  onDeleteAccount,
  showToast,
}) => {
  const { tenant, refreshTenant } = useAuth();
  const [streamerGender, setStreamerGender] = useState<'male' | 'female'>((tenant?.gender as 'male' | 'female') || 'male');
  const [isUpdatingGender, setIsUpdatingGender] = useState(false);

  useEffect(() => {
    if (tenant?.gender && (tenant.gender === 'male' || tenant.gender === 'female')) {
      setStreamerGender(tenant.gender as 'male' | 'female');
    }
  }, [tenant?.gender]);

  const handleGenderChange = async (newGender: 'male' | 'female') => {
    if (isUpdatingGender || streamerGender === newGender) return;
    setStreamerGender(newGender);
    if (tenant?.id) {
      setIsUpdatingGender(true);
      try {
        await updateTenant(tenant.id, { gender: newGender });
        if (refreshTenant) {
          await refreshTenant();
        }
        showToast('success', `Streamer gender set to ${newGender === 'male' ? 'Male' : 'Female'}. Grammar rules updated.`);
      } catch (err: any) {
        showToast('error', 'Failed to update streamer gender.');
      } finally {
        setIsUpdatingGender(false);
      }
    }
  };

  // Read cached channel from localStorage as fallback
  const cached = useMemo(() => {
    try {
      const raw = localStorage.getItem('bhola_cached_channel');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const channelName = tenant?.name || cached?.name || 'Channel Account';
  const channelHandle = tenant?.handle || cached?.handle || '@streamer';
  const rawChannelId = tenant?.channel_id || cached?.channelId || '';
  const channelId = /^\d+$/.test(rawChannelId) ? '' : rawChannelId;
  const avatarUrl = tenant?.avatar_url !== undefined ? tenant?.avatar_url : (cached?.avatarUrl || null);
  const avatarInitial =
    tenant?.avatar_initial ||
    cached?.avatarInitial ||
    (channelName && channelName !== 'Channel Account' ? channelName[0]?.toUpperCase() : 'S');

  const [superChatAlert, setSuperChatAlert] = useState(true);
  const [sessionSummaryEmail, setSessionSummaryEmail] = useState(false);
  const [isSavingNotificationSettings, setIsSavingNotificationSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync notification settings from Supabase bot_configs
  useEffect(() => {
    let isMounted = true;
    if (tenant?.id) {
      fetchBotConfig(tenant.id)
        .then((cfg) => {
          if (isMounted && cfg) {
            if (cfg.superchat_alerts_enabled !== undefined) {
              setSuperChatAlert(Boolean(cfg.superchat_alerts_enabled));
            }
            if (cfg.session_summary_email_enabled !== undefined) {
              setSessionSummaryEmail(Boolean(cfg.session_summary_email_enabled));
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  // Dynamic moderator video guide URL with clean fallback
  const [videoTutorialUrl, setVideoTutorialUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('bhola_moderator_guide_video_url') ||
        'https://www.youtube.com/results?search_query=how+to+add+moderator+on+youtube+studio'
      );
    } catch {
      return 'https://www.youtube.com/results?search_query=how+to+add+moderator+on+youtube+studio';
    }
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchGuideUrl() {
      try {
        const client = getSupabaseClient();
        if (client && isSupabaseConfigured()) {
          // `system_settings` is not in the generated Supabase schema types; cast through
          // `unknown` first (required because PostgrestBuilder and Promise don't overlap enough).
          type SystemSettingsRow = { moderator_guide_video_url?: string } | null;
          const { data, error } = await (client
            .from('system_settings')
            .select('moderator_guide_video_url')
            .limit(1)
            .maybeSingle() as unknown as Promise<{ data: SystemSettingsRow; error: any }>);

          const guideUrl = data?.moderator_guide_video_url;
          if (!error && guideUrl && isMounted) {
            setVideoTutorialUrl(guideUrl);
            try {
              localStorage.setItem('bhola_moderator_guide_video_url', guideUrl);
            } catch {}
          }
        }
      } catch {
        // Fallback already set
      }
    }
    fetchGuideUrl();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleSuperChat = async () => {
    const next = !superChatAlert;
    setSuperChatAlert(next);
    if (tenant?.id) {
      setIsSavingNotificationSettings(true);
      try {
        await saveBotConfig(tenant.id, { superchat_alerts_enabled: next });
        showToast('success', `Super Chat Alert turned ${next ? 'ON' : 'OFF'} & saved to Supabase.`);
      } catch {
        showToast('error', 'Failed to save Super Chat setting to database.');
      } finally {
        setIsSavingNotificationSettings(false);
      }
    } else {
      showToast('info', `Super Chat Alert turned ${next ? 'ON' : 'OFF'}`);
    }
  };

  const handleToggleSummary = async () => {
    const next = !sessionSummaryEmail;
    setSessionSummaryEmail(next);
    if (tenant?.id) {
      setIsSavingNotificationSettings(true);
      try {
        await saveBotConfig(tenant.id, { session_summary_email_enabled: next });
        showToast(
          'success',
          next
            ? 'Subscribed to Session Summary Emails! (Digests start upon background worker dispatch)'
            : 'Unsubscribed from Session Summary Emails.'
        );
      } catch {
        showToast('error', 'Failed to save email setting to database.');
      } finally {
        setIsSavingNotificationSettings(false);
      }
    } else {
      showToast('info', `Session Summary Email turned ${next ? 'ON' : 'OFF'}`);
    }
  };

  // Canonical bot channel url, handle, and avatar
  const rawBotHandle = activePersona?.handle?.replace(/^@/, '').trim() || '';
  const cleanBotHandle = rawBotHandle
    ? rawBotHandle
    : (activePersona?.id?.toLowerCase().includes('band') || activePersona?.name?.toLowerCase().includes('band'))
    ? 'BandyaAI'
    : (activePersona?.id?.toLowerCase().includes('babu') || activePersona?.name?.toLowerCase().includes('babu'))
    ? 'BabuRaoAI'
    : 'BholaAI';

  const botChannelUrl = `https://www.youtube.com/@${cleanBotHandle}`;

  const botAvatarUrl =
    activePersona?.avatar_url ||
    activePersona?.avatarUrl ||
    ((activePersona?.id?.toLowerCase().includes('band') || activePersona?.name?.toLowerCase().includes('band'))
      ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
      : (activePersona?.id?.toLowerCase().includes('babu') || activePersona?.name?.toLowerCase().includes('babu'))
      ? 'https://yt3.googleusercontent.com/rBd03_24svcGnSIwueK9-bE75hsIYM4gMC5nc1znT1tvoHvibUBpHx6gHBW6ljGHUHUs1yeI6g=s900-c-k-c0x00ffffff-no-rj'
      : 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj');

  const handleCopyChannelUrl = () => {
    navigator.clipboard?.writeText(botChannelUrl);
    setCopiedLink(true);
    showToast('info', 'Copied channel link to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="page-settings" className="w-full flex flex-col py-6 px-4 sm:px-6 max-w-4xl">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">
          Settings
        </h2>
        <p className="text-sm text-[#a1a1aa] mt-1">
          Manage your account and bot configuration.
        </p>
      </div>

      {/* SECTION 1 — ACCOUNT */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
          ACCOUNT
        </span>

        <div className="flex items-center gap-4 mt-4">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-[#1c1c1c] border border-[#262626] flex items-center justify-center font-bold text-xl text-[#f97316] shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={channelName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              avatarInitial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-[#fafafa] truncate">
              {channelName}
            </div>
            <div className="text-sm font-mono text-[#a1a1aa] truncate">
              {channelHandle}
            </div>
            <a
              href={channelId ? `https://youtube.com/channel/${channelId}` : 'https://youtube.com'}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#52525b] hover:text-[#f97316] transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              <span>View on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="w-full h-px bg-[#1a1a1a] my-5" />

        <button
          id="btn-disconnect-yt"
          onClick={onDisconnectAccount}
          className="border border-[#ef4444]/40 text-[#ef4444] rounded-lg px-4 py-2 text-sm hover:bg-[#200000] hover:border-[#ef4444] transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect YouTube Account</span>
        </button>
      </div>

      {/* SECTION 2 — PERSONA */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg mt-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
          ACTIVE PERSONA
        </span>

        <div className="flex items-center justify-between mt-4">
          <div className="bg-[#1c0a00] border border-[#f97316]/50 rounded-full px-4 py-2 inline-flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#f97316]" />
            <span className="text-xs font-semibold text-[#f97316] font-mono">
              {activePersona.name} ({activePersona.tagline})
            </span>
          </div>

          <button
            id="btn-change-persona"
            onClick={onNavigatePersonas}
            className="border border-[#262626] text-[#a1a1aa] rounded-lg px-3.5 py-1.5 text-sm hover:border-[#f97316]/40 hover:text-[#f97316] transition-colors cursor-pointer"
          >
            Change Persona
          </button>
        </div>

        <p className="text-xs text-[#52525b] mt-3">
          ⚠️ Changing persona will reset your current session configuration. Manage all personalities in the Persona Hub.
        </p>
      </div>

      {/* SECTION 2.5 — STREAMER GENDER */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg mt-4">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa] block">
          STREAMER GENDER
        </span>
        <p className="text-xs text-[#71717a] mt-1 mb-4">
          Ensures your AI co-host addresses you with correct Urdu/Punjabi grammar.
        </p>

        <div className="inline-flex rounded-lg bg-[#18181b] p-1 border border-[#262626] gap-1">
          <button
            type="button"
            id="btn-gender-male"
            onClick={() => handleGenderChange('male')}
            disabled={isUpdatingGender}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              streamerGender === 'male'
                ? 'bg-[#f97316] text-[#080808] font-bold shadow'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <span>♂ Male</span>
          </button>
          <button
            type="button"
            id="btn-gender-female"
            onClick={() => handleGenderChange('female')}
            disabled={isUpdatingGender}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              streamerGender === 'female'
                ? 'bg-[#ec4899] text-[#080808] font-bold shadow'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <span>♀ Female</span>
          </button>
        </div>
      </div>

      {/* SECTION 3 — NOTIFICATIONS */}
      <div className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg mt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
            STREAM NOTIFICATIONS &amp; AUTOMATION
          </span>
          <span className="text-[10px] font-mono text-[#52525b]">
            Supabase · bot_configs
          </span>
        </div>

        <div className="flex flex-col mt-3 space-y-1">
          {/* Row 1 — Super Chat Alert */}
          <div className="flex items-center justify-between py-3.5 border-b border-[#1a1a1a]">
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-[#fafafa]">
                  Super Chat Alert
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Live Active ✓
                </span>
              </div>
              <div className="text-xs text-[#71717a] mt-0.5">
                Automatically triggers royal greetings, banter, and superchat celebrations during live streams.
              </div>
            </div>
            <button
              id="toggle-superchat-alert"
              onClick={handleToggleSuperChat}
              disabled={isSavingNotificationSettings}
              role="switch"
              aria-checked={superChatAlert}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                superChatAlert ? 'bg-[#f97316]' : 'bg-[#262626]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#fafafa] shadow-md transform transition-transform ${
                  superChatAlert ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Row 2 — Session Summary Email */}
          <div className="flex items-center justify-between py-3.5">
            <div className="pr-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-[#fafafa]">
                  Session Summary Email
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <span>Coming Soon 🚀</span>
                </span>
              </div>
              <div className="text-xs text-[#71717a] mt-0.5">
                Receive automated PDF stream summary and token analytics sent to <span className="text-[#a1a1aa] font-mono">{tenant?.email || 'channel email'}</span> after each broadcast.
              </div>
            </div>
            <button
              id="toggle-summary-email"
              onClick={handleToggleSummary}
              disabled={isSavingNotificationSettings}
              role="switch"
              aria-checked={sessionSummaryEmail}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 ${
                sessionSummaryEmail ? 'bg-[#f97316]' : 'bg-[#262626]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-[#fafafa] shadow-md transform transition-transform ${
                  sessionSummaryEmail ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4 — YOUTUBE MODERATOR SETUP & PERMISSIONS */}
      <div id="section-moderator-guide" className="bg-[#111111] border border-[#262626] rounded-xl p-6 shadow-lg mt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
              YOUTUBE MODERATOR SETUP &amp; PERMISSIONS
            </span>
            <p className="text-xs text-[#71717a] mt-0.5">
              Ensure your AI co-host has moderator rights so YouTube chat displays responses without spam filtering.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Standard Moderator</span>
          </span>
        </div>

        {/* Active Co-Host Profile & Copy URL Box */}
        <div className="mt-5 p-4 rounded-xl bg-[#161616] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1c] border border-orange-500/40 flex items-center justify-center">
                {botAvatarUrl ? (
                  <img
                    src={botAvatarUrl}
                    alt={activePersona.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="text-xl">{activePersona.avatarEmoji || '🤖'}</span>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#161616]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#fafafa] truncate">
                  {activePersona.name}
                </span>
                <span className="text-xs font-mono text-[#f97316]">
                  @{cleanBotHandle}
                </span>
              </div>
              <div className="text-xs font-mono text-[#a1a1aa] truncate mt-0.5 select-all">
                {botChannelUrl}
              </div>
            </div>
          </div>

          <button
            id="btn-copy-moderator-link"
            onClick={handleCopyChannelUrl}
            className="shrink-0 border border-[#262626] hover:border-orange-500/50 bg-[#1c1c1c] text-[#fafafa] hover:text-[#f97316] rounded-lg px-3.5 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied channel link!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Bot Channel URL</span>
              </>
            )}
          </button>
        </div>

        {/* 3-Step Setup Instructions */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="p-3 bg-[#161616] border border-[#222222] rounded-lg flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="text-xs text-[#a1a1aa] leading-relaxed">
              <strong className="text-[#fafafa]">Open YouTube Studio:</strong> Go to{' '}
              <a
                href="https://studio.youtube.com"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline hover:text-orange-300"
              >
                studio.youtube.com
              </a>{' '}
              and click <span className="text-[#fafafa] font-medium">Settings ⚙️</span> in the bottom-left sidebar.
            </div>
          </div>

          <div className="p-3 bg-[#161616] border border-[#222222] rounded-lg flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="text-xs text-[#a1a1aa] leading-relaxed">
              <strong className="text-[#fafafa]">Navigate to Community &gt; Automated Filters:</strong> In the settings popup, click{' '}
              <span className="text-[#fafafa] font-medium">Community</span>, then choose the{' '}
              <span className="text-[#fafafa] font-medium">Automated Filters</span> tab at the top.
            </div>
          </div>

          <div className="p-3 bg-[#161616] border border-[#222222] rounded-lg flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div className="text-xs text-[#a1a1aa] leading-relaxed">
              <strong className="text-[#fafafa]">Paste URL in Standard Moderators:</strong> Paste the copied bot channel URL into{' '}
              <span className="text-[#fafafa] font-medium">Standard Moderators</span>, select{' '}
              <strong className="text-orange-400">{activePersona.name}</strong> from the dropdown, and click{' '}
              <span className="text-[#fafafa] font-medium">Save</span> at the bottom right.
            </div>
          </div>
        </div>

        {/* External Action Links */}
        <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between gap-3">
          <a
            id="btn-open-youtube-studio"
            href="https://studio.youtube.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-400 hover:bg-orange-500/25 hover:text-orange-300 text-xs font-semibold transition-colors"
          >
            <span>Open YouTube Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            id="btn-watch-moderator-tutorial"
            href={videoTutorialUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#262626] bg-[#161616] hover:bg-[#202020] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-medium transition-colors"
          >
            <Video className="w-3.5 h-3.5 text-orange-400" />
            <span>Watch Video Tutorial 📺</span>
            <ExternalLink className="w-3 h-3 text-[#71717a]" />
          </a>
        </div>
      </div>

      {/* SECTION 5 — DANGER ZONE */}
      <div className="bg-[#200000] border border-[#ef4444]/30 rounded-xl p-6 shadow-lg mt-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[#ef4444]">
          DANGER ZONE
        </span>
        <p className="text-xs text-[#a1a1aa] mt-1">
          Permanent actions. Cannot be undone.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {/* Button 1 */}
          {!showClearConfirm ? (
            <button
              id="btn-clear-all-history"
              onClick={() => setShowClearConfirm(true)}
              className="border border-[#ef4444]/40 text-[#ef4444] rounded-lg px-4 py-2.5 text-sm hover:bg-[#ef4444]/10 w-full text-left flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Session History</span>
            </button>
          ) : (
            <div className="p-3 bg-[#111111] border border-[#ef4444]/60 rounded-lg flex items-center justify-between gap-3">
              <span className="text-xs text-[#ef4444] font-medium">
                Confirm clearing all session logs?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 text-xs border border-[#262626] text-[#a1a1aa] rounded hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowClearConfirm(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-[#ef4444] text-[#fafafa] font-semibold rounded hover:bg-[#dc2626] cursor-pointer"
                >
                  Confirm Clear
                </button>
              </div>
            </div>
          )}

          {/* Button 2 */}
          {!showDeleteConfirm ? (
            <button
              id="btn-delete-account"
              onClick={() => setShowDeleteConfirm(true)}
              className="border border-[#ef4444]/40 text-[#ef4444] rounded-lg px-4 py-2.5 text-sm hover:bg-[#ef4444] hover:text-[#fafafa] w-full text-left flex items-center gap-2.5 transition-all duration-150 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Delete Account &amp; All Data</span>
            </button>
          ) : (
            <div className="p-3 bg-[#111111] border border-[#ef4444]/60 rounded-lg flex items-center justify-between gap-3">
              <span className="text-xs text-[#ef4444] font-medium">
                Permanently delete all account data and logout?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2.5 py-1 text-xs border border-[#262626] text-[#a1a1aa] rounded hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteAccount();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-2.5 py-1 text-xs bg-[#ef4444] text-[#fafafa] font-semibold rounded hover:bg-[#dc2626] cursor-pointer"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Service Terms & Legal Compliance Disclaimer */}
      <div className="p-3.5 bg-surface/50 border border-border/40 rounded-xl text-xs text-text-muted/70 leading-relaxed flex items-start gap-2.5 shadow-sm">
        <span className="shrink-0 text-sm">⚖️</span>
        <div>
          <span className="font-semibold text-text-secondary">Platform Service Notice:</span>{' '}
          AI co-host personas, voices, and underlying models may be updated, temporarily suspended, or retired in compliance with YouTube Live Community Guidelines, copyright standards, or operational maintenance.
        </div>
      </div>
    </div>
  );
};
