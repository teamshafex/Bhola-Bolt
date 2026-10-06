import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  Lock,
  Unlock,
  MoreVertical,
  FileText,
  X,
  Check,
} from 'lucide-react';
import { Chatter, ChatterRole } from '../../types';
import { getRoleMeta } from '../../data/constants';
import { SubscriptionTier, fetchAudienceRoles, AudienceRole, normalizeAudienceRoleId } from '@bhola/database';

interface AudienceMatrixPanelProps {
  chatters: Chatter[];
  onAddClick: () => void;
  onEditClick: (chatter: Chatter) => void;
  onDeleteClick: (id: string) => void;
  onUpdateRole: (id: string, role: ChatterRole) => void;
  onUpdateRoleAndLock?: (id: string, role: ChatterRole, isLocked: boolean) => void;
  onToggleLockRole?: (id: string, isLocked: boolean) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  fullPageView?: boolean;
  subscriptionTier?: SubscriptionTier;
  onOpenPricing?: () => void;
}

export const AudienceMatrixPanel: React.FC<AudienceMatrixPanelProps> = ({
  chatters,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onUpdateRole,
  onUpdateRoleAndLock,
  onToggleLockRole,
  onUpdateNotes,
  fullPageView = false,
  subscriptionTier = 'starter',
  onOpenPricing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [openRoleMenuId, setOpenRoleMenuId] = useState<string | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [editingNotesChatter, setEditingNotesChatter] = useState<Chatter | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [dynamicRoles, setDynamicRoles] = useState<AudienceRole[]>([]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-trigger') && !target.closest('.dropdown-menu-content')) {
        setOpenRoleMenuId(null);
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Load dynamic audience roles from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const roles = await fetchAudienceRoles(false);
        if (isMounted && roles && roles.length > 0) {
          setDynamicRoles(roles);
        }
      } catch (err) {
        console.warn('Failed to load audience roles in AudienceMatrixPanel:', err);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  const fallbackRoles: AudienceRole[] = [
    { id: 'streamer', label: 'Streamer (Host)', default_sentiment: '', color: '#f97316' },
    { id: 'vip_superchatter', label: 'VIP Superchatter', default_sentiment: '', color: '#eab308' },
    { id: 'troll', label: 'Troll / Heckler', default_sentiment: '', color: '#ef4444' },
    { id: 'female_viewer', label: 'Female Viewer', default_sentiment: '', color: '#ec4899' },
    { id: 'mod_male', label: 'Mod (Male)', default_sentiment: '', color: '#6366f1' },
    { id: 'regular_buddy', label: 'Regular Buddy', default_sentiment: '', color: '#10b981' },
  ];

  const effectiveRoles = dynamicRoles.length > 0 ? dynamicRoles : fallbackRoles;

  const filterTabs = useMemo(() => {
    return ['All', ...effectiveRoles.map((r) => r.label)];
  }, [effectiveRoles]);

  const filteredChatters = useMemo(() => {
    return chatters.filter((c) => {
      // Search filter
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Role filter tab
      if (activeFilter === 'All') return true;

      const targetRole = effectiveRoles.find((r) => r.label === activeFilter);
      if (!targetRole) return true;

      const normChatterRole = normalizeAudienceRoleId(c.role);
      return (
        c.role === targetRole.id ||
        normChatterRole === targetRole.id ||
        c.role.toLowerCase() === targetRole.label.toLowerCase()
      );
    });
  }, [chatters, searchQuery, activeFilter, effectiveRoles]);

  const handleApplyRoleAndLock = (chatterId: string, roleId: string) => {
    if (onUpdateRoleAndLock) {
      onUpdateRoleAndLock(chatterId, roleId as ChatterRole, true);
    } else {
      onUpdateRole(chatterId, roleId as ChatterRole);
    }
    setOpenRoleMenuId(null);
    setOpenActionMenuId(null);
  };

  const handleToggleLock = (chatter: Chatter) => {
    if (onToggleLockRole) {
      onToggleLockRole(chatter.id, !chatter.isRoleLocked);
    }
    setOpenActionMenuId(null);
  };

  const handleOpenNotesEditor = (chatter: Chatter) => {
    setEditingNotesChatter(chatter);
    setNotesDraft(chatter.notes || '');
    setOpenActionMenuId(null);
  };

  const handleSaveNotes = () => {
    if (editingNotesChatter && onUpdateNotes) {
      onUpdateNotes(editingNotesChatter.id, notesDraft.trim());
    }
    setEditingNotesChatter(null);
  };

  return (
    <div
      id="panel-audience-matrix"
      className={`bg-[#111111] border border-[#262626] rounded-xl overflow-hidden shadow-lg flex flex-col ${
        fullPageView ? 'mx-0 sm:mx-6 my-4' : 'mt-6 w-full'
      }`}
    >
      {/* Panel Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#a1a1aa]">
            AUDIENCE MATRIX
          </span>
          <span className="font-mono text-xs text-[#52525b] ml-1">
            ({filteredChatters.length}
            {subscriptionTier === 'starter' ? '/3 max' : ''})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {subscriptionTier === 'starter' && chatters.length >= 3 && (
            <button
              onClick={onOpenPricing}
              className="text-xs text-[#f97316] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Unlock Unlimited</span>
              <span>→</span>
            </button>
          )}

          <button
            id="btn-add-chatter"
            disabled={subscriptionTier === 'starter' && chatters.length >= 3}
            onClick={() => {
              if (subscriptionTier === 'starter' && chatters.length >= 3) {
                onOpenPricing?.();
              } else {
                onAddClick();
              }
            }}
            title={
              subscriptionTier === 'starter' && chatters.length >= 3
                ? 'Starter limit reached (3 chatters). Upgrade to Pro for unlimited.'
                : 'Add Chatter'
            }
            className={`border rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#f97316] ${
              subscriptionTier === 'starter' && chatters.length >= 3
                ? 'border-zinc-800 bg-zinc-800/40 text-zinc-500 cursor-not-allowed opacity-75'
                : 'border-[#262626] text-[#a1a1aa] hover:border-[#f97316]/40 hover:text-[#fafafa] cursor-pointer'
            }`}
          >
            {subscriptionTier === 'starter' && chatters.length >= 3 ? (
              <Lock className="w-3 h-3 text-amber-400" />
            ) : (
              <UserPlus className="w-3 h-3" />
            )}
            <span>
              {subscriptionTier === 'starter' && chatters.length >= 3
                ? 'Limit Reached (3/3)'
                : 'Add Chatter'}
            </span>
          </button>
        </div>
      </div>

      {/* Search + Filter Row */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex gap-3 items-center flex-wrap">
        {/* Search Input */}
        <div className="flex-1 min-w-[200px] bg-[#1c1c1c] border border-[#262626] rounded-lg h-9 px-3 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#52525b] shrink-0" />
          <input
            id="input-search-chatters"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, handle or notes..."
            className="w-full bg-transparent text-xs text-[#fafafa] placeholder-[#52525b] outline-none"
          />
        </div>

        {/* Dynamic Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button
                key={tab}
                id={`tab-filter-${tab.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveFilter(tab)}
                className={`text-xs px-3 py-1 rounded-full cursor-pointer transition-colors whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-[#1c0a00] text-[#f97316] border border-[#f97316]/40 font-medium'
                      : 'text-[#52525b] hover:text-[#a1a1aa]'
                  }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredChatters.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
          <Users className="w-12 h-12 text-[#262626]" />
          <p className="text-sm text-[#52525b] font-medium mt-3">
            No chatters found
          </p>
          <p className="text-xs text-[#52525b] mt-1">
            They'll appear automatically as they interact in chat or you can add one above.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP 4-COLUMN TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1c1c1c] text-[10px] uppercase tracking-wider text-[#52525b] border-b border-[#1a1a1a]">
                  <th className="py-3 px-4 font-semibold">CHATTER</th>
                  <th className="py-3 px-4 font-semibold">ROLE</th>
                  <th className="py-3 px-4 font-semibold">LAST SEEN</th>
                  <th className="py-3 px-4 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {filteredChatters.map((c) => {
                  const roleMeta = getRoleMeta(c.role, effectiveRoles);
                  const isRoleMenuOpen = openRoleMenuId === c.id;
                  const isActionMenuOpen = openActionMenuId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* CHATTER */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#262626] flex items-center justify-center text-xs font-semibold text-[#f97316] shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium text-[#fafafa] truncate">
                                {c.name}
                              </span>
                              {c.autoIngested && (
                                <span
                                  className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 rounded"
                                  title="Auto-ingested from live stream chat"
                                >
                                  Auto
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-[#52525b]">
                              {c.handle}
                            </div>
                            {c.notes && (
                              <div
                                className="text-[11px] text-[#a1a1aa] truncate max-w-xs flex items-center gap-1 mt-0.5"
                                title={c.notes}
                              >
                                <FileText className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                                <span className="italic truncate">{c.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ROLE */}
                      <td className="py-3 px-4 relative">
                        <div className="relative inline-block text-left dropdown-trigger">
                          <button
                            onClick={() => {
                              setOpenRoleMenuId(isRoleMenuOpen ? null : c.id);
                              setOpenActionMenuId(null);
                            }}
                            className={`bg-[#1c1c1c] border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-2 hover:border-[#f97316]/40 transition-colors cursor-pointer ${
                              c.isRoleLocked
                                ? 'border-amber-500/40 text-[#fafafa]'
                                : 'border-[#262626] text-[#fafafa]'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: roleMeta.color }}
                            />
                            <span>{roleMeta.label}</span>
                            {c.isRoleLocked ? (
                              <span
                                className="text-amber-400 ml-0.5"
                                title="Role Locked: Streamer assigned, heuristics will not overwrite"
                              >
                                <Lock className="w-3 h-3" />
                              </span>
                            ) : (
                              <ChevronDown className="w-3 h-3 text-[#52525b]" />
                            )}
                          </button>

                          {/* Role Dropdown */}
                          {isRoleMenuOpen && (
                            <div className="absolute left-0 top-full mt-1 w-48 bg-[#1c1c1c] border border-[#262626] rounded-lg shadow-xl py-1 z-30 max-h-56 overflow-y-auto dropdown-menu-content">
                              <div className="px-2.5 py-1 text-[10px] uppercase font-semibold text-zinc-500 border-b border-zinc-800/80 mb-1">
                                Assign & Lock Role
                              </div>
                              {effectiveRoles.map((r) => {
                                const rm = getRoleMeta(r.id, effectiveRoles);
                                return (
                                  <button
                                    key={r.id}
                                    onClick={() => handleApplyRoleAndLock(c.id, r.id)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-white/5 flex items-center justify-between text-[#fafafa] cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: rm.color }}
                                      />
                                      <span className="truncate">{r.label}</span>
                                    </div>
                                    <Lock className="w-2.5 h-2.5 text-amber-400/80 shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* LAST SEEN */}
                      <td className="py-3 px-4 font-mono text-xs text-[#52525b]">
                        {c.lastSeen}
                      </td>

                      {/* ACTIONS: 3-DOTS MENU & QUICK ICONS */}
                      <td className="py-3 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 3-DOTS ACTION DROPDOWN TRIGGER */}
                          <div className="relative inline-block text-left dropdown-trigger">
                            <button
                              onClick={() => {
                                setOpenActionMenuId(isActionMenuOpen ? null : c.id);
                                setOpenRoleMenuId(null);
                              }}
                              className="p-1.5 rounded-lg border border-[#262626] bg-[#1c1c1c] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#f97316]/40 transition-colors cursor-pointer"
                              title="Chatter actions"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* 3-DOTS ACTION DROPDOWN MENU */}
                            {isActionMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 w-56 bg-[#181818] border border-[#2e2e2e] rounded-xl shadow-2xl p-1.5 z-50 text-left dropdown-menu-content">
                                <div className="px-2.5 py-1 border-b border-[#262626] flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa] truncate max-w-[120px]">
                                    {c.name}
                                  </span>
                                  {c.isRoleLocked ? (
                                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                                      <Lock className="w-2.5 h-2.5" /> Locked
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                      Dynamic
                                    </span>
                                  )}
                                </div>

                                {/* CHANGE & LOCK ROLE */}
                                <div className="px-2 py-1 text-[10px] uppercase font-semibold text-[#71717a]">
                                  Change & Lock Role
                                </div>
                                <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto mb-1">
                                  {effectiveRoles.map((r) => {
                                    const rm = getRoleMeta(r.id, effectiveRoles);
                                    const isCurrent =
                                      c.role === r.id ||
                                      normalizeAudienceRoleId(c.role) === r.id ||
                                      c.role.toLowerCase() === r.label.toLowerCase();

                                    return (
                                      <button
                                        key={r.id}
                                        onClick={() => handleApplyRoleAndLock(c.id, r.id)}
                                        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                          isCurrent
                                            ? 'bg-[#1c0a00] text-[#f97316] font-medium'
                                            : 'hover:bg-white/5 text-[#d4d4d8]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: rm.color }}
                                          />
                                          <span className="truncate">{r.label}</span>
                                        </div>
                                        <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-1 opacity-70" />
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="border-t border-[#262626] my-1" />

                                {/* TOGGLE ROLE LOCK */}
                                <button
                                  onClick={() => handleToggleLock(c)}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                                >
                                  {c.isRoleLocked ? (
                                    <>
                                      <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Unlock Role (Heuristics)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Lock Current Role 🔒</span>
                                    </>
                                  )}
                                </button>

                                {/* EDIT NOTES & TAGS */}
                                <button
                                  onClick={() => handleOpenNotesEditor(c)}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Edit Notes & Tags</span>
                                </button>

                                {/* EDIT DETAILS */}
                                <button
                                  onClick={() => {
                                    onEditClick(c);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-orange-400" />
                                  <span>Edit Chatter</span>
                                </button>

                                {/* DELETE CHATTER */}
                                <button
                                  onClick={() => {
                                    onDeleteClick(c.id);
                                    setOpenActionMenuId(null);
                                  }}
                                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-red-500/10 flex items-center gap-2 text-red-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Chatter</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Quick Edit Button */}
                          <button
                            onClick={() => onEditClick(c)}
                            className="text-[#52525b] hover:text-[#f97316] transition-colors p-1 cursor-pointer"
                            title="Edit Chatter"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Delete Button */}
                          <button
                            onClick={() => onDeleteClick(c.id)}
                            className="text-[#52525b] hover:text-[#ef4444] transition-colors p-1 cursor-pointer"
                            title="Delete Chatter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD LIST */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {filteredChatters.map((c) => {
              const isActionMenuOpen = openActionMenuId === c.id;

              return (
                <div
                  key={c.id}
                  className="bg-[#1c1c1c] border border-[#262626] rounded-xl p-4 flex flex-col gap-3 relative"
                >
                  {/* Row 1: Avatar + Name + Handle + 3-Dots Menu */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#262626] flex items-center justify-center text-xs font-semibold text-[#f97316]">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-[#fafafa]">
                            {c.name}
                          </span>
                          {c.isRoleLocked && (
                            <span className="text-amber-400 text-xs" title="Role Locked">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                          {c.autoIngested && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 bg-zinc-800 border border-zinc-700/50 text-zinc-400 rounded">
                              Auto
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-[#52525b]">
                          {c.handle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 relative dropdown-trigger">
                      <button
                        onClick={() => setOpenActionMenuId(isActionMenuOpen ? null : c.id)}
                        className="text-[#a1a1aa] hover:text-[#fafafa] p-1.5 border border-[#262626] bg-[#111] rounded-lg cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isActionMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-[#181818] border border-[#2e2e2e] rounded-xl shadow-2xl p-1.5 z-50 text-left dropdown-menu-content">
                          <button
                            onClick={() => handleToggleLock(c)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                          >
                            {c.isRoleLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Unlock Role</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Lock Role 🔒</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenNotesEditor(c)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Edit Notes & Tags</span>
                          </button>
                          <button
                            onClick={() => {
                              onEditClick(c);
                              setOpenActionMenuId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-white/5 flex items-center gap-2 text-[#d4d4d8] cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-orange-400" />
                            <span>Edit Chatter</span>
                          </button>
                          <button
                            onClick={() => {
                              onDeleteClick(c.id);
                              setOpenActionMenuId(null);
                            }}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-red-500/10 flex items-center gap-2 text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Chatter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes Preview if available */}
                  {c.notes && (
                    <div className="text-xs text-[#a1a1aa] bg-[#111111] p-2 rounded-lg border border-[#262626] italic flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate">{c.notes}</span>
                    </div>
                  )}

                  {/* Row 2: Role Selector Pills */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase text-[#52525b] font-semibold">
                        ROLE:
                      </span>
                      {c.isRoleLocked && (
                        <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {effectiveRoles.map((r) => {
                        const rm = getRoleMeta(r.id, effectiveRoles);
                        const isSelected =
                          c.role === r.id ||
                          normalizeAudienceRoleId(c.role) === r.id ||
                          c.role.toLowerCase() === r.label.toLowerCase();
                        return (
                          <button
                            key={r.id}
                            onClick={() => handleApplyRoleAndLock(c.id, r.id)}
                            className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 cursor-pointer transition-colors
                              ${
                                isSelected
                                  ? 'border-[#f97316] bg-[#1c0a00] text-[#f97316]'
                                  : 'border-[#262626] text-[#a1a1aa] hover:border-[#333333]'
                              }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: rm.color }}
                            />
                            <span>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 3: Last seen */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#262626]/50">
                    <span className="text-[10px] text-[#52525b]">Last Seen:</span>
                    <span className="font-mono text-[10px] text-[#a1a1aa]">
                      {c.lastSeen}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* EDIT NOTES & TAGS MODAL */}
      {editingNotesChatter && (
        <div
          id="edit-notes-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[#1c1c1c] border border-[#262626] rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div>
                <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#f97316]" />
                  Edit Notes & Tags
                </h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  {editingNotesChatter.name} ({editingNotesChatter.handle})
                </p>
              </div>
              <button
                onClick={() => setEditingNotesChatter(null)}
                className="text-[#71717a] hover:text-[#fafafa] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="text-xs uppercase font-medium tracking-wider text-[#a1a1aa]">
                Memory Notes & Chatter Tags (Used by AI Co-Host)
              </label>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="e.g. Frequent Superchatter, loves PUBG stream, likes bantering about tea"
                className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-[#f97316] resize-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNotesChatter(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#262626] text-xs text-[#a1a1aa] hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-1.5 rounded-lg bg-[#f97316] text-xs font-semibold text-[#080808] hover:bg-[#ea580c] cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
