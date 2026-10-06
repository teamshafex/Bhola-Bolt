import { useState, useCallback } from 'react';
import { Persona, StreamStatus, Chatter, ChatterRole, BroadcastSession } from '../types';
import { PERSONAS } from '../data/constants';
import { MOCK_CHATTERS, MOCK_SESSIONS } from '../mock/previewData';
import { AmbientFrequency, SubscriptionTier, ActiveBotPersona } from '../lib/databaseShim';

export function useStreamerState(initialTier: SubscriptionTier = 'pro') {
  const [activePersonaId, setActivePersonaId] = useState<string>('bandya');
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('live');
  const [botEnabled, setBotEnabled] = useState<boolean>(true);

  const [roastIntensity, setRoastIntensity] = useState<number>(7);
  const [ambientFreq, setAmbientFreq] = useState<AmbientFrequency>('Balanced');
  const [slangs, setSlangs] = useState<string[]>(['Chhapri', '🌚', 'scene on hai', 'Chal bay', 'OP bolte']);

  const [chatters, setChatters] = useState<Chatter[]>(MOCK_CHATTERS);
  const [sessions, setSessions] = useState<BroadcastSession[]>(MOCK_SESSIONS);

  const [tokensUsed, setTokensUsed] = useState<number>(42500);
  const [messagesSent, setMessagesSent] = useState<number>(148);
  const maxTokens = initialTier === 'starter' ? 30000 : initialTier === 'pro' ? 150000 : 500000;
  const sessionCost = 0.042;
  const avgLatency = 420;

  const activePersona: Persona = PERSONAS.find((p) => p.id === activePersonaId) || PERSONAS[0];

  const handleSwitchPersona = useCallback(async (bot: ActiveBotPersona | Persona) => {
    const id = (bot as any).persona_id || bot.id;
    setActivePersonaId(id);
  }, []);

  const handleToggleBot = useCallback(() => {
    setBotEnabled((prev) => !prev);
  }, []);

  const handleChangeStreamStatus = useCallback((status: StreamStatus) => {
    setStreamStatus(status);
  }, []);

  const handleChangeRoastIntensity = useCallback((val: number) => {
    setRoastIntensity(val);
  }, []);

  const handleChangeAmbientFreq = useCallback((val: AmbientFrequency) => {
    setAmbientFreq(val);
  }, []);

  const handleAddSlang = useCallback((slang: string) => {
    if (!slang || !slang.trim()) return;
    setSlangs((prev) => (prev.includes(slang.trim()) ? prev : [...prev, slang.trim()]));
  }, []);

  const handleRemoveSlang = useCallback((slang: string) => {
    setSlangs((prev) => prev.filter((s) => s !== slang));
  }, []);

  const handleResetDefaults = useCallback(() => {
    setRoastIntensity(5);
    setAmbientFreq('Balanced');
    setSlangs(['Chhapri', '🌚', 'scene on hai', 'Chal bay']);
  }, []);

  const handleClearSlangs = useCallback(() => {
    setSlangs([]);
  }, []);

  const handleAddChatter = useCallback((chatter: Omit<Chatter, 'id'>) => {
    const newChatter: Chatter = {
      ...chatter,
      id: `c_${Date.now()}`,
    };
    setChatters((prev) => [newChatter, ...prev]);
  }, []);

  const handleEditChatter = useCallback((chatter: Omit<Chatter, 'id'>, editId?: string) => {
    if (!editId) return;
    setChatters((prev) =>
      prev.map((c) => (c.id === editId ? { ...c, ...chatter } : c))
    );
  }, []);

  const handleDeleteChatter = useCallback((id: string) => {
    setChatters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleUpdateChatterRole = useCallback((id: string, role: ChatterRole) => {
    setChatters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, role } : c))
    );
  }, []);

  const handleToggleLockRole = useCallback((id: string, isLocked: boolean) => {
    setChatters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isRoleLocked: isLocked } : c))
    );
  }, []);

  const handleUpdateNotes = useCallback((id: string, notes: string) => {
    setChatters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, notes } : c))
    );
  }, []);

  return {
    tenantId: 't_streamer_01',
    activePersona,
    activePersonaId,
    botEnabled,
    streamStatus,
    tokensUsed,
    maxTokens,
    sessionCost,
    messagesSent,
    avgLatency,
    roastIntensity,
    ambientFreq,
    slangs,
    chatters,
    sessions,
    handleSwitchPersona,
    handleToggleBot,
    handleChangeStreamStatus,
    handleChangeRoastIntensity,
    handleChangeAmbientFreq,
    handleAddSlang,
    handleRemoveSlang,
    handleResetDefaults,
    handleClearSlangs,
    handleAddChatter,
    handleEditChatter,
    handleDeleteChatter,
    handleUpdateChatterRole,
    handleToggleLockRole,
    handleUpdateNotes,
  };
}
