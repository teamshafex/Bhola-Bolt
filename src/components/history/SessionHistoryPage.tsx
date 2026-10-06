import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Download,
  Search,
  Crown,
  Zap,
  Flame,
  Shield,
  User,
  Heart,
  Radio,
  Clock,
  Sparkles,
  RefreshCw,
  Trash2,
  MessageSquare,
  Archive,
  Layers,
  Calendar,
  Hourglass,
  Coins,
  FileText,
  X,
  ChevronRight,
} from 'lucide-react';
import { BroadcastSession, SessionData, FeedMessage, ChatterRole } from '../../types';
import { getRoleMeta } from '../../data/constants';

export interface SessionHistoryPageProps {
  sessionData?: BroadcastSession | SessionData | null;
  sessions?: BroadcastSession[] | SessionData[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onFetchSessionMessages?: (sessionId: string) => Promise<FeedMessage[]>;
  onCreateDemoSession?: (streamType?: 'live' | 'premiere') => Promise<SessionData | null>;
  onDeleteSession?: (sessionId: string) => Promise<boolean>;
  onExportSession?: (session: BroadcastSession, messages: FeedMessage[]) => void;
  // Legacy props for backward compatibility
  historyMessages?: FeedMessage[];
  onExport?: () => void;
}

/** Formats timestamps into a clean, human-readable display e.g. "Oct 05, 2026 • 9:30 PM" */
function formatSessionDate(dateTime?: string, createdAt?: string): string {
  const raw = createdAt || dateTime;
  if (!raw) return '—';

  // If already contains the bullet separator
  if (raw.includes('•')) return raw;

  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${month} ${day}, ${year} • ${time}`;
    }
  } catch {}

  return raw;
}

/** Returns the display stream title with intuitive fallbacks */
function getSessionTitle(session: BroadcastSession): string {
  if (session.title && session.title.trim().length > 0) return session.title.trim();
  if (session.streamTitle && session.streamTitle.trim().length > 0) return session.streamTitle.trim();
  const isPremiere = session.streamType?.toLowerCase() === 'premiere';
  return isPremiere ? 'Scheduled Premiere Broadcast' : 'YouTube Live Stream';
}

/** Calculates user chats count and co-host banters delivered */
function getChatActivity(session: BroadcastSession) {
  const messagesSent = session.messagesSent || 0;
  const userChats =
    session.userChatsCount ??
    session.totalUserChats ??
    Math.max(messagesSent * 3, messagesSent);
  return { userChats, messagesSent };
}

export const SessionHistoryPage: React.FC<SessionHistoryPageProps> = ({
  sessionData,
  sessions = [],
  isLoading = false,
  onRefresh,
  onFetchSessionMessages,
  onDeleteSession,
  onExportSession,
  historyMessages = [],
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [streamTypeFilter, setStreamTypeFilter] = useState<'all' | 'live' | 'premiere'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected session for Slide-Over Drawer Log view
  const [activeLogSession, setActiveLogSession] = useState<BroadcastSession | null>(null);
  const [transcriptRoleFilter, setTranscriptRoleFilter] = useState<string>('All');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // Cached messages per session ID
  const [sessionMessagesMap, setSessionMessagesMap] = useState<Record<string, FeedMessage[]>>({});
  const [loadingLogSessionId, setLoadingLogSessionId] = useState<string | null>(null);

  // Unified list of sessions
  const displaySessions = useMemo<BroadcastSession[]>(() => {
    if (sessions && sessions.length > 0) return sessions;
    if (sessionData) return [sessionData];
    return [];
  }, [sessions, sessionData]);

  // Filtered sessions based on search & streamType filter
  const filteredSessions = useMemo(() => {
    return displaySessions.filter((s) => {
      if (streamTypeFilter !== 'all') {
        const type = (s.streamType || 'live').toLowerCase();
        if (type !== streamTypeFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = getSessionTitle(s).toLowerCase();
        const matchesTitle = title.includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesDate = (s.dateTime || '').toLowerCase().includes(q);
        const matchesPersona = (s.personaUsed || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesDate && !matchesPersona) return false;
      }
      return true;
    });
  }, [displaySessions, streamTypeFilter, searchQuery]);

  // Close log drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLogSession(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Log Drawer and fetch transcript
  const handleOpenLogs = useCallback(
    async (session: BroadcastSession) => {
      setActiveLogSession(session);
      setTranscriptRoleFilter('All');
      setTranscriptSearch('');

      if (!sessionMessagesMap[session.id] && onFetchSessionMessages) {
        setLoadingLogSessionId(session.id);
        try {
          const msgs = await onFetchSessionMessages(session.id);
          setSessionMessagesMap((prev) => ({ ...prev, [session.id]: msgs }));
        } catch (err) {
          console.warn('Failed to load session message transcript:', session.id, err);
        } finally {
          setLoadingLogSessionId(null);
        }
      }
    },
    [sessionMessagesMap, onFetchSessionMessages]
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportSingleSession = (session: BroadcastSession) => {
    const messages = sessionMessagesMap[session.id] || (session.id === sessionData?.id ? historyMessages : []);
    if (onExportSession) {
      onExportSession(session, messages);
      return;
    }

    // Default download JSON
    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      platform: 'Bhola 2.0 AI Co-Host',
      session,
      messageTranscript: messages,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bhola_session_${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRoleIcon = (role: ChatterRole | string) => {
    const norm = String(role || '').toLowerCase();
    if (norm.includes('streamer') || norm.includes('host')) return <Crown className="w-2.5 h-2.5 shrink-0" />;
    if (norm.includes('vip') || norm.includes('superchatter')) return <Zap className="w-2.5 h-2.5 shrink-0" />;
    if (norm.includes('troll')) return <Flame className="w-2.5 h-2.5 shrink-0" />;
    if (norm.includes('mod')) return <Shield className="w-2.5 h-2.5 shrink-0" />;
    if (norm.includes('female')) return <Heart className="w-2.5 h-2.5 shrink-0" />;
    return <User className="w-2.5 h-2.5 shrink-0" />;
  };

  const renderStreamTypeBadge = (streamType?: string) => {
    const isPremiere = streamType?.toLowerCase() === 'premiere';
    if (isPremiere) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="w-2.5 h-2.5" />
          <span>PREMIERE</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span>LIVE</span>
      </span>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const norm = (status || 'completed').toLowerCase();
    if (norm === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
          <span>Active</span>
        </span>
      );
    }
    if (norm === 'interrupted') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
          Interrupted
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        Completed
      </span>
    );
  };

  // Active drawer messages
  const activeLogMessages = useMemo(() => {
    if (!activeLogSession) return [];
    return sessionMessagesMap[activeLogSession.id] || (activeLogSession.id === sessionData?.id ? historyMessages : []);
  }, [activeLogSession, sessionMessagesMap, sessionData?.id, historyMessages]);

  const filteredLogMessages = useMemo(() => {
    return activeLogMessages.filter((m) => {
      if (transcriptSearch.trim()) {
        const q = transcriptSearch.toLowerCase();
        const matchesText = m.text.toLowerCase().includes(q);
        const matchesName = m.chatterName.toLowerCase().includes(q);
        if (!matchesText && !matchesName) return false;
      }
      if (transcriptRoleFilter !== 'All') {
        const normRole = String(m.role || '').toLowerCase();
        if (transcriptRoleFilter === 'Trolls' && !normRole.includes('troll')) return false;
        if (transcriptRoleFilter === 'VIPs' && !normRole.includes('vip')) return false;
        if (transcriptRoleFilter === 'Streamer' && !normRole.includes('streamer') && !normRole.includes('host')) return false;
        if (transcriptRoleFilter === 'Mods' && !normRole.includes('mod')) return false;
        if (transcriptRoleFilter === 'Females' && !normRole.includes('female')) return false;
        if (transcriptRoleFilter === 'Regulars' && !normRole.includes('regular') && !normRole.includes('general')) return false;
      }
      return true;
    });
  }, [activeLogMessages, transcriptSearch, transcriptRoleFilter]);

  return (
    <div id="page-session-history" className="w-full flex flex-col py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-[#fafafa]">
              Session History
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#141414] text-[#a1a1aa] border border-[#262626]">
              {displaySessions.length} {displaySessions.length === 1 ? 'Broadcast' : 'Broadcasts'}
            </span>
          </div>
          <p className="text-sm text-[#71717a] mt-1">
            Review past YouTube Live streams, co-host banter activity, and token consumption logs.
          </p>
        </div>

        {/* Clean Controls (subtle Refresh & optional Export) */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="border border-[#262626] bg-[#111111] hover:bg-[#1a1a1a] hover:border-zinc-700 text-[#a1a1aa] hover:text-[#fafafa] rounded-lg px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-orange-400' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          {onExport && displaySessions.length > 0 && (
            <button
              onClick={onExport}
              className="border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 rounded-lg px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              title="Export all session archives"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR (Only shown when sessions exist) */}
      {displaySessions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-[#0e0e0e] border border-[#222222] rounded-xl p-3">
          {/* Stream Type Filter Tabs */}
          <div className="flex items-center gap-1">
            {(['all', 'live', 'premiere'] as const).map((filter) => {
              const isActive = streamTypeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setStreamTypeFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors font-medium ${
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40 shadow-sm'
                      : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  {filter === 'all' ? 'All Streams' : filter === 'live' ? 'Live Streams' : 'Premieres'}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#52525b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stream title or co-host..."
              className="w-full bg-[#161616] border border-[#262626] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#fafafa] placeholder-[#52525b] focus:border-orange-500/50 focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* 3. CONTENT AREA: Loading Skeleton, Minimal Empty State, Filtered Empty, or Real Session Table */}
      {isLoading && displaySessions.length === 0 ? (
        /* Loading Skeleton Table */
        <div className="bg-[#0e0e0e] border border-[#222222] rounded-xl overflow-hidden p-4 space-y-3">
          <div className="h-6 bg-zinc-800/40 rounded w-1/4 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-zinc-900/60 rounded-lg animate-pulse border border-zinc-800/40" />
          ))}
        </div>
      ) : displaySessions.length === 0 ? (
        /* Minimal Empty State Container (Requirement 2) */
        <div className="py-20 px-6 flex flex-col items-center justify-center text-center bg-[#0d0d0d] border border-[#222222] rounded-2xl max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center mb-4 text-orange-400/90 shadow-inner">
            <Radio className="w-7 h-7 text-orange-500/90" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-[#fafafa]">
            No Stream Sessions Yet
          </h3>
          <p className="text-sm text-[#71717a] mt-2 max-w-md leading-relaxed">
            Your past YouTube Live streams, chat volume, and Bhola co-host metrics will appear here once you go live.
          </p>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="mt-6 border border-[#262626] bg-[#141414] hover:bg-[#1c1c1c] hover:border-zinc-700 text-[#a1a1aa] hover:text-[#fafafa] rounded-lg px-3.5 py-2 text-xs font-medium inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>Check for New Sessions</span>
            </button>
          )}
        </div>
      ) : filteredSessions.length === 0 ? (
        /* Empty Search Results */
        <div className="py-16 flex flex-col items-center justify-center text-center bg-[#0e0e0e] border border-[#222222] rounded-xl">
          <Archive className="w-10 h-10 text-[#3f3f46] mb-3" />
          <h4 className="text-base font-semibold text-[#a1a1aa]">No sessions matched your filter</h4>
          <p className="text-xs text-[#52525b] mt-1">Try clearing your search query or switching stream tabs.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStreamTypeFilter('all');
            }}
            className="mt-4 px-3 py-1.5 text-xs text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* 4. REAL SESSION TABLE / LIST VIEW */
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[#0e0e0e] border border-[#222222] rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1f1f1f] bg-[#121212] text-[#71717a] font-semibold uppercase tracking-wider text-[10px]">
                    <th scope="col" className="py-3.5 px-4">Date & Time</th>
                    <th scope="col" className="py-3.5 px-4">Stream Title & Type</th>
                    <th scope="col" className="py-3.5 px-4">Duration</th>
                    <th scope="col" className="py-3.5 px-4">Chat Activity</th>
                    <th scope="col" className="py-3.5 px-4">Token / Cost Usage</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#18181b]">
                  {filteredSessions.map((session) => {
                    const title = getSessionTitle(session);
                    const formattedDate = formatSessionDate(session.dateTime, session.createdAt);
                    const { userChats, messagesSent } = getChatActivity(session);

                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* 1. Date & Time */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="font-mono text-xs text-[#fafafa] font-medium">
                              {formattedDate}
                            </span>
                          </div>
                        </td>

                        {/* 2. Stream Title & Type */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-[#f4f4f5] line-clamp-1 group-hover:text-orange-400 transition-colors">
                                {title}
                              </span>
                              {renderStreamTypeBadge(session.streamType)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                              <Sparkles className="w-3 h-3 text-orange-400/80" />
                              <span>Co-host: {session.personaUsed || 'Bhola'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Duration */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-[#d4d4d8]">
                            <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{session.duration || '0m'}</span>
                          </div>
                        </td>

                        {/* 4. Chat Activity */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs text-[#fafafa] font-medium">
                              <MessageSquare className="w-3 h-3 text-zinc-400" />
                              <span>{userChats.toLocaleString()} user chats</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-orange-400 font-medium">
                              <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                              <span>{messagesSent.toLocaleString()} {session.personaUsed || 'Bhola'} replies</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Token / Cost Usage */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 font-mono text-xs text-[#fafafa]">
                              <Layers className="w-3 h-3 text-zinc-500" />
                              <span>{session.tokensUsed.toLocaleString()} tokens</span>
                            </div>
                            <span className="font-mono text-[11px] text-[#71717a] pl-4">
                              ${(session.sessionCost ?? (session.tokensUsed * 0.0000005)).toFixed(4)}
                            </span>
                          </div>
                        </td>

                        {/* 6. Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {renderStatusBadge(session.status)}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenLogs(session)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#161616] hover:bg-[#202020] border border-[#27272a] hover:border-orange-500/40 text-[#fafafa] inline-flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5 text-orange-400" />
                              <span>View Logs</span>
                            </button>

                            <button
                              onClick={() => handleExportSingleSession(session)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1c1c] border border-transparent hover:border-zinc-700 transition-colors"
                              title="Export transcript JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteSession && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Delete this broadcast session from history?')) {
                                    onDeleteSession(session.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filteredSessions.map((session) => {
              const title = getSessionTitle(session);
              const formattedDate = formatSessionDate(session.dateTime, session.createdAt);
              const { userChats, messagesSent } = getChatActivity(session);

              return (
                <div
                  key={session.id}
                  className="bg-[#0e0e0e] border border-[#222222] rounded-xl p-4 space-y-3 shadow-md"
                >
                  {/* Top Bar: Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderStreamTypeBadge(session.streamType)}
                        <span className="font-semibold text-xs text-[#fafafa]">
                          {title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                    {renderStatusBadge(session.status)}
                  </div>

                  {/* Metrics Strip */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1c1c1c] text-xs">
                    <div className="bg-[#141414] rounded-lg p-2 border border-[#222222]">
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Duration</span>
                      <span className="font-mono font-medium text-[#d4d4d8]">{session.duration || '0m'}</span>
                    </div>

                    <div className="bg-[#141414] rounded-lg p-2 border border-[#222222]">
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Chat Volume</span>
                      <span className="font-mono font-medium text-[#fafafa]">{userChats} chats / {messagesSent} replies</span>
                    </div>

                    <div className="bg-[#141414] rounded-lg p-2 border border-[#222222]">
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">AI Tokens Burned</span>
                      <span className="font-mono font-medium text-orange-400">{session.tokensUsed.toLocaleString()}</span>
                    </div>

                    <div className="bg-[#141414] rounded-lg p-2 border border-[#222222]">
                      <span className="text-[10px] text-[#71717a] uppercase font-semibold block">Co-Host Persona</span>
                      <span className="font-medium text-[#fafafa]">{session.personaUsed || 'Bhola'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1c1c1c]">
                    <button
                      onClick={() => handleExportSingleSession(session)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 border border-[#262626] bg-[#141414] inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={() => handleOpenLogs(session)}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Logs</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SLIDE-OVER LOG DRAWER / MODAL */}
      {activeLogSession && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl h-full bg-[#0d0d0d] border-l border-[#262626] flex flex-col shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1f1f1f] bg-[#111111] flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {renderStreamTypeBadge(activeLogSession.streamType)}
                  {renderStatusBadge(activeLogSession.status)}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/25">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{activeLogSession.personaUsed || 'Bhola'}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#fafafa] line-clamp-1 mt-0.5">
                  {getSessionTitle(activeLogSession)}
                </h3>

                <div className="flex items-center gap-3 text-xs text-[#71717a]">
                  <span>{formatSessionDate(activeLogSession.dateTime, activeLogSession.createdAt)}</span>
                  <span>•</span>
                  <span>Duration: {activeLogSession.duration || '0m'}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveLogSession(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Close logs (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-[#141414] border-b border-[#1f1f1f] text-center">
              <div className="p-2 rounded bg-[#0a0a0a] border border-[#222222]">
                <div className="text-[10px] uppercase font-semibold text-[#71717a]">User Chats</div>
                <div className="font-mono text-sm font-bold text-[#fafafa] mt-0.5">
                  {getChatActivity(activeLogSession).userChats.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded bg-[#0a0a0a] border border-[#222222]">
                <div className="text-[10px] uppercase font-semibold text-[#71717a]">Co-Host Banters</div>
                <div className="font-mono text-sm font-bold text-orange-400 mt-0.5">
                  {activeLogSession.messagesSent.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded bg-[#0a0a0a] border border-[#222222]">
                <div className="text-[10px] uppercase font-semibold text-[#71717a]">Tokens Burned</div>
                <div className="font-mono text-sm font-bold text-[#fafafa] mt-0.5">
                  {activeLogSession.tokensUsed.toLocaleString()}
                </div>
              </div>

              <div className="p-2 rounded bg-[#0a0a0a] border border-[#222222]">
                <div className="text-[10px] uppercase font-semibold text-[#71717a]">Session Cost</div>
                <div className="font-mono text-sm font-bold text-amber-400 mt-0.5">
                  ${(activeLogSession.sessionCost ?? (activeLogSession.tokensUsed * 0.0000005)).toFixed(4)}
                </div>
              </div>
            </div>

            {/* Transcript Controls Row */}
            <div className="p-4 border-b border-[#1f1f1f] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0f0f0f]">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#52525b] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder="Search chat transcript by message or user..."
                  className="w-full bg-[#161616] border border-[#262626] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#fafafa] placeholder-[#52525b] focus:border-orange-500/50 focus:outline-none"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center flex-wrap gap-1">
                {['All', 'Streamer', 'Mods', 'VIPs', 'Trolls', 'Females', 'Regulars'].map((filter) => {
                  const isActive = transcriptRoleFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setTranscriptRoleFilter(filter)}
                      className={`text-[11px] px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40 font-medium'
                          : 'text-[#71717a] hover:text-[#d4d4d8] bg-[#161616]'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transcript Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0a0a0a]">
              {loadingLogSessionId === activeLogSession.id ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mb-2" />
                  <p className="text-xs text-[#71717a]">Loading message logs...</p>
                </div>
              ) : filteredLogMessages.length === 0 ? (
                <div className="py-16 text-center bg-[#111111] rounded-xl border border-[#222222] p-6">
                  <p className="text-xs text-[#71717a]">
                    {activeLogMessages.length === 0
                      ? 'No chat messages were recorded during this broadcast session.'
                      : 'No messages match the current search or role filter.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#18181b] border border-[#222222] rounded-xl bg-[#0f0f0f] overflow-hidden">
                  {filteredLogMessages.map((msg) => {
                    const roleMeta = getRoleMeta(msg.role);
                    return (
                      <div
                        key={msg.id}
                        className="px-4 py-3 flex gap-3 items-start hover:bg-white/[0.02] transition-colors"
                      >
                        <div
                          className="w-1 min-h-[32px] rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: roleMeta.color }}
                        />
                        <div className="font-mono text-[10px] text-[#52525b] shrink-0 min-w-[42px] pt-0.5">
                          {msg.timestamp}
                        </div>
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#e4e4e7]">
                              {msg.chatterName}
                            </span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 border"
                              style={{
                                backgroundColor: roleMeta.bgSubtle,
                                borderColor: roleMeta.border,
                                color: roleMeta.color,
                              }}
                            >
                              {renderRoleIcon(msg.role)}
                              <span>{roleMeta.label}</span>
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#fafafa] leading-relaxed break-words mt-0.5">
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#1f1f1f] bg-[#111111] flex items-center justify-between gap-3">
              <span className="text-xs text-[#71717a]">
                Showing {filteredLogMessages.length} of {activeLogMessages.length} messages
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleSession(activeLogSession)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Transcript</span>
                </button>

                <button
                  onClick={() => setActiveLogSession(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-[#1a1a1a] hover:bg-[#242424] border border-[#27272a] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
