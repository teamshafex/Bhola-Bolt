import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  CreditCard,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  Persona,
  ToastItem,
  NavTab,
  Chatter,
  ChatterRole,
} from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useStreamerState } from './hooks/useStreamerState';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { HeaderBar } from './components/HeaderBar';
import { VibeControlPanel } from './components/dashboard/VibeControlPanel';
import { LiveFeedPanel } from './components/dashboard/LiveFeedPanel';
import { TelemetryPanel } from './components/dashboard/TelemetryPanel';
import { AudienceMatrixPanel } from './components/dashboard/AudienceMatrixPanel';
import { SessionHistoryPage } from './components/history/SessionHistoryPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { PersonaHubPage } from './components/personas/PersonaHubPage';
import { AddChatterModal } from './components/AddChatterModal';
import { PricingModal } from './components/PricingModal';
import { MockCheckoutModal } from './components/MockCheckoutModal';
import { ToastContainer } from './components/ToastContainer';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PlanConfig } from './lib/databaseShim';

function PreviewAppInner() {
  const { user, tenant, subscriptionTier, updateSubscription, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanConfig | null>(null);

  // Chatter Modal State
  const [isChatterModalOpen, setIsChatterModalOpen] = useState(false);
  const [editingChatter, setEditingChatter] = useState<Chatter | null>(null);

  // Floating HUD Controller State
  const [isHudControllerOpen, setIsHudControllerOpen] = useState(true);
  const [showOnboardingPreview, setShowOnboardingPreview] = useState(false);

  const showToast = (type: 'info' | 'success' | 'error', message: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, type, message };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const state = useStreamerState(subscriptionTier);

  const handleOpenPricing = () => setIsPricingOpen(true);

  const handleSelectPlanForCheckout = (plan: PlanConfig) => {
    setSelectedPlanForCheckout(plan);
    setIsPricingOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="flex h-screen w-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans select-none">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Pricing & Checkout Modals */}
      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        currentTier={subscriptionTier}
        onSelectPlanForCheckout={handleSelectPlanForCheckout}
      />

      <MockCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        targetPlan={selectedPlanForCheckout}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          showToast('success', `Plan upgraded to ${selectedPlanForCheckout?.planName || 'Pro'}!`);
        }}
        showToast={showToast}
      />

      {/* Add / Edit Chatter Modal */}
      <AddChatterModal
        isOpen={isChatterModalOpen}
        onClose={() => {
          setIsChatterModalOpen(false);
          setEditingChatter(null);
        }}
        editingChatter={editingChatter}
        onSave={(chatterData, editId) => {
          if (editId) {
            state.handleEditChatter(chatterData, editId);
            showToast('success', `Updated chatter ${chatterData.name}`);
          } else {
            state.handleAddChatter(chatterData);
            showToast('success', `Added ${chatterData.name} to Audience Matrix`);
          }
          setIsChatterModalOpen(false);
          setEditingChatter(null);
        }}
      />

      {/* Onboarding Flow Preview Modal */}
      {showOnboardingPreview && (
        <div className="fixed inset-0 z-[9999] bg-[#07090e]/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/30 bg-[#0e121a] p-6 shadow-2xl">
            <button
              onClick={() => setShowOnboardingPreview(false)}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-mono bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Close Onboarding Preview ✕
            </button>
            <OnboardingFlow
              onComplete={(persona) => {
                showToast('success', `Onboarding completed with ${persona.name}!`);
                setShowOnboardingPreview(false);
              }}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Left Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'pricing') handleOpenPricing();
          else setCurrentTab(tab);
        }}
        botEnabled={state.botEnabled}
        channelName={tenant?.channel_title}
        channelHandle={tenant?.channel_handle || '@aligaming_live'}
        channelId={tenant?.channel_id}
        avatarUrl={tenant?.avatar_url}
        subscriptionTier={subscriptionTier}
        onOpenPricing={handleOpenPricing}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-[#07090e] to-[#07090e]">
        {/* Top Header HUD Bar */}
        <HeaderBar
          streamStatus={state.streamStatus}
          onChangeStreamStatus={state.handleChangeStreamStatus}
          botEnabled={state.botEnabled}
          onToggleBot={state.handleToggleBot}
          showToast={showToast}
          channelName={tenant?.channel_title}
          channelHandle={tenant?.channel_handle || '@aligaming_live'}
          channelId={tenant?.channel_id}
          avatarUrl={tenant?.avatar_url}
          subscriptionTier={subscriptionTier}
          onOpenPricing={handleOpenPricing}
        />

        {/* Viewport Router */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            {currentTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-7xl mx-auto"
              >
                {/* 3-Column Command Center Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Live Telemetry & Bot Health (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    <TelemetryPanel
                      activePersona={state.activePersona}
                      streamStatus={state.streamStatus}
                      botEnabled={state.botEnabled}
                      tokensUsed={state.tokensUsed}
                      sessionCost={state.sessionCost}
                      avgLatency={state.avgLatency}
                      messagesSent={state.messagesSent}
                      subscriptionTier={subscriptionTier}
                      maxTokens={state.maxTokens}
                      onOpenPricing={handleOpenPricing}
                      onNavigatePersonas={() => setCurrentTab('personas')}
                    />

                    <VibeControlPanel
                      roastIntensity={state.roastIntensity}
                      onChangeIntensity={state.handleChangeRoastIntensity}
                      ambientFreq={state.ambientFreq}
                      onChangeFreq={state.handleChangeAmbientFreq}
                      slangs={state.slangs}
                      onAddSlang={state.handleAddSlang}
                      onRemoveSlang={state.handleRemoveSlang}
                      onResetDefaults={state.handleResetDefaults}
                      onClearSlangs={state.handleClearSlangs}
                      subscriptionTier={subscriptionTier}
                      onOpenPricing={handleOpenPricing}
                      activePersonaName={state.activePersona.name}
                      showToast={showToast}
                    />
                  </div>

                  {/* Right Column: Live Feed & Interactive Chat Monitor (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    <LiveFeedPanel
                      streamStatus={state.streamStatus}
                      botEnabled={state.botEnabled}
                      activePersona={state.activePersona}
                      roastIntensity={state.roastIntensity}
                      customSlangs={state.slangs}
                      subscriptionTier={subscriptionTier}
                      onOpenPricing={handleOpenPricing}
                      showToast={showToast}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {currentTab === 'personas' && (
              <motion.div
                key="personas"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <PersonaHubPage
                  activePersona={state.activePersona}
                  onSwitchPersona={state.handleSwitchPersona}
                  subscriptionTier={subscriptionTier}
                  onOpenPricing={handleOpenPricing}
                  showToast={showToast}
                  streamStatus={state.streamStatus}
                  tenant={tenant}
                />
              </motion.div>
            )}

            {currentTab === 'audience' && (
              <motion.div
                key="audience"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <AudienceMatrixPanel
                  chatters={state.chatters}
                  onAddClick={() => {
                    setEditingChatter(null);
                    setIsChatterModalOpen(true);
                  }}
                  onEditClick={(c) => {
                    setEditingChatter(c);
                    setIsChatterModalOpen(true);
                  }}
                  onDeleteClick={state.handleDeleteChatter}
                  onUpdateRole={state.handleUpdateChatterRole}
                  onToggleLockRole={state.handleToggleLockRole}
                  onUpdateNotes={state.handleUpdateNotes}
                  fullPageView={true}
                  subscriptionTier={subscriptionTier}
                  onOpenPricing={handleOpenPricing}
                />
              </motion.div>
            )}

            {currentTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <SessionHistoryPage
                  sessions={state.sessions}
                  isLoading={false}
                />
              </motion.div>
            )}

            {currentTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-7xl mx-auto"
              >
                <SettingsPage
                  activePersona={state.activePersona}
                  onNavigatePersonas={() => setCurrentTab('personas')}
                  onDisconnectAccount={logout}
                  onClearHistory={() => showToast('info', 'Session history cleared')}
                  onDeleteAccount={() => showToast('error', 'Account deletion is disabled in preview mode')}
                  showToast={showToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </div>

      {/* ── FLOATING HUD TEST CONTROLLER (For Bolt.new & Live Evaluation) ── */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0e121a]/90 backdrop-blur-xl p-3 shadow-[0_0_25px_rgba(0,240,255,0.15)] text-xs text-slate-300">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 font-mono font-semibold text-cyan-400">
                <Sliders className="w-3.5 h-3.5" />
                <span>HUD CONTROLLER</span>
              </div>
              <button
                onClick={() => setIsHudControllerOpen((prev) => !prev)}
                className="text-zinc-500 hover:text-white"
              >
                {isHudControllerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isHudControllerOpen && (
              <div className="mt-2 space-y-2.5 pt-1">
                {/* Stream Status Toggle */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block mb-1">
                    Stream Status
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['live', 'premiere', 'offline'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => state.handleChangeStreamStatus(st)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-all ${
                          state.streamStatus === st
                            ? st === 'live'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                              : st === 'premiere'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {st.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan Tier Toggle */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono block mb-1">
                    Subscription Tier
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['starter', 'pro', 'studio'] as const).map((tr) => (
                      <button
                        key={tr}
                        onClick={() => updateSubscription(tr)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono capitalize transition-all ${
                          subscriptionTier === tr
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                            : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Onboarding Wizard */}
                <button
                  onClick={() => setShowOnboardingPreview(true)}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/60 text-[11px] font-mono flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Preview Onboarding Flow</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PreviewAppInner />
    </AuthProvider>
  );
}
