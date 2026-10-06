import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Chatter, ChatterRole } from '../types';
import { getRoleMeta } from '../data/constants';
import { fetchAudienceRoles, AudienceRole } from '@bhola/database';

interface AddChatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chatter: Omit<Chatter, 'id'>, editId?: string) => void;
  editingChatter?: Chatter | null;
}

export const AddChatterModal: React.FC<AddChatterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingChatter,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [role, setRole] = useState<ChatterRole>('regular_buddy');
  const [notes, setNotes] = useState('');
  const [isRoleLocked, setIsRoleLocked] = useState(false);
  const [lastSeen, setLastSeen] = useState('Just now');
  const [dynamicRoles, setDynamicRoles] = useState<AudienceRole[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const roles = await fetchAudienceRoles(false);
        if (isMounted && roles && roles.length > 0) {
          setDynamicRoles(roles);
        }
      } catch (err) {
        console.warn('Failed to load audience roles in AddChatterModal:', err);
      }
    }
    if (isOpen) {
      loadRoles();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (editingChatter) {
      setName(editingChatter.name);
      setHandle(editingChatter.handle);
      setRole(editingChatter.role);
      setNotes(editingChatter.notes || '');
      setIsRoleLocked(Boolean(editingChatter.isRoleLocked));
      setLastSeen(editingChatter.lastSeen);
    } else {
      setName('');
      setHandle('');
      setRole(dynamicRoles[0]?.id as ChatterRole || 'regular_buddy');
      setNotes('');
      setIsRoleLocked(false);
      setLastSeen('Live now');
    }
  }, [editingChatter, isOpen, dynamicRoles]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedHandle = handle.startsWith('@')
      ? handle
      : `@${handle || name.toLowerCase().replace(/\s+/g, '_')}`;

    onSave(
      {
        name: name.trim(),
        handle: formattedHandle,
        role,
        notes: notes.trim(),
        isRoleLocked,
        lastSeen,
      },
      editingChatter ? editingChatter.id : undefined
    );
    onClose();
  };

  const fallbackRoles: AudienceRole[] = [
    { id: 'streamer', label: 'Streamer (Host)', default_sentiment: '', color: '#f97316' },
    { id: 'vip_superchatter', label: 'VIP Superchatter', default_sentiment: '', color: '#eab308' },
    { id: 'troll', label: 'Troll / Heckler', default_sentiment: '', color: '#ef4444' },
    { id: 'female_viewer', label: 'Female Viewer', default_sentiment: '', color: '#ec4899' },
    { id: 'mod_male', label: 'Mod (Male)', default_sentiment: '', color: '#6366f1' },
    { id: 'regular_buddy', label: 'Regular Buddy', default_sentiment: '', color: '#10b981' },
  ];

  const effectiveRoles = dynamicRoles.length > 0 ? dynamicRoles : fallbackRoles;

  return (
    <div
      id="add-chatter-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-[#1c1c1c] border border-[#262626] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <h3 className="text-lg font-bold text-[#fafafa]">
            {editingChatter ? 'Edit Chatter' : 'Add New Chatter'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#52525b] hover:text-[#fafafa] p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* 1. Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase font-medium tracking-wider text-[#a1a1aa]">
              Username *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DesiGamer99"
              className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
            />
          </div>

          {/* 2. Handle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase font-medium tracking-wider text-[#a1a1aa]">
              Handle
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@desigamer99"
              className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#fafafa] placeholder-[#52525b] font-mono focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
            />
          </div>

          {/* 3. Role Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase font-medium tracking-wider text-[#a1a1aa]">
                Role Category
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[#fafafa] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRoleLocked}
                  onChange={(e) => setIsRoleLocked(e.target.checked)}
                  className="rounded border-[#333] text-[#f97316] focus:ring-[#f97316] accent-[#f97316]"
                />
                <span className="text-[11px] text-[#a1a1aa] hover:text-[#fafafa]">Lock Role 🔒</span>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {effectiveRoles.map((r) => {
                const conf = getRoleMeta(r.id, effectiveRoles);
                const isSelected =
                  role === r.id ||
                  (role === 'regular' && (r.id === 'regular_buddy' || r.id === 'general_viewer')) ||
                  (role === 'vip' && r.id === 'vip_superchatter') ||
                  (role === 'female' && r.id === 'female_viewer') ||
                  (role === 'mod' && (r.id === 'mod_male' || r.id === 'mod_female'));

                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setRole(r.id as ChatterRole)}
                    className={`flex items-center justify-start gap-2 py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-left truncate ${
                      isSelected
                        ? 'border-[#f97316] bg-[#1c0a00] text-[#f97316]'
                        : 'border-[#262626] bg-[#111111] hover:bg-white/5 text-[#a1a1aa]'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: conf.color }}
                    />
                    <span className="truncate">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Notes & Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase font-medium tracking-wider text-[#a1a1aa]">
              Notes & Memory Tags
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Big supporter, loves teasing Babu Rao, gamer from Lahore"
              className="bg-[#111111] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808] resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-[#262626] text-[#a1a1aa] font-medium text-sm hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-lg bg-[#f97316] text-[#080808] font-semibold text-sm hover:bg-[#ea580c] transition-colors cursor-pointer"
            >
              {editingChatter ? 'Save Changes' : 'Add Chatter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
