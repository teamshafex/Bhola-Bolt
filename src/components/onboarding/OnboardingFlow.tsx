import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Step1Welcome } from './Step1Welcome';
import { StepSelectChannel } from './StepSelectChannel';
import { Step2Persona } from './Step2Persona';
import { Step3ModWizard } from './Step3ModWizard';
import { Step4PlanSelect } from './Step4PlanSelect';
import { Persona } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { saveBotConfig, updateTenant, YouTubeChannelItem, ActiveBotPersona } from '@bhola/database';

interface OnboardingFlowProps {
  onComplete: (lockedPersona: Persona) => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
}

type OnboardingStep = 'welcome' | 'channel' | 'persona' | 'mod' | 'plan';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  showToast,
}) => {
  const { user, tenant, subscriptionTier, logout } = useAuth();

  // Determine initial step based on auth & channel selection state
  const getInitialStep = (): OnboardingStep => {
    if (!user) return 'welcome';
    if (!tenant?.channel_id) return 'channel';
    return 'persona';
  };

  const [step, setStep] = useState<OnboardingStep>(getInitialStep);
  const [selectedBot, setSelectedBot] = useState<ActiveBotPersona | null>(null);

  // Immediate Bypass Guard for Existing Tenants
  useEffect(() => {
    // If the user already has a valid channel and active bot in Supabase,
    // do NOT trap them in the wizard. Automatically complete onboarding.
    if (tenant?.onboarding_completed || (tenant?.channel_id && tenant?.channel_id.startsWith('UC') && tenant?.active_bot_id)) {
      const isBandya = (tenant.active_bot_id || '').toLowerCase().includes('band');
      const isBabu = (tenant.active_bot_id || '').toLowerCase().includes('babu');
      const resolvedPersona: Persona = {
        id: isBandya ? 'bandya' : isBabu ? 'baburao' : 'bhola',
        name: isBandya ? 'Bandya' : isBabu ? 'Babu Rao' : 'Bhola',
        handle: isBandya ? 'bandya-hoon' : isBabu ? 'baburao-hoon' : 'bhola-hoon',
        avatar_url: tenant.avatar_url || null,
        avatarUrl: tenant.avatar_url || null,
        avatarEmoji: '',
        tagline: isBandya ? 'The Stressed Comedic Crybaby' : isBabu ? 'Wise Comeback Artist' : 'Lead Desi Co-Host',
        sampleDialogues: [],
        specialtyTags: [],
      };
      onComplete(resolvedPersona);
    }
  }, [tenant, onComplete]);

  // Sync step when user state loads or changes
  useEffect(() => {
    if (!user) {
      setStep('welcome');
      return;
    }

    if (tenant?.channel_id) {
      if (step === 'welcome' || step === 'channel') {
        setStep('persona');
      }
      return;
    }

    if (step === 'welcome') {
      setStep('channel');
    }
  }, [user, tenant?.channel_id, step]);

  const handleChannelSelected = (_channel: YouTubeChannelItem) => {
    // Note: StepSelectChannel already fires the verification success toast,
    // so we avoid duplicate popups here and smoothly transition.
    setStep('persona');
  };

  const handleLockPersona = async (lockedBot: ActiveBotPersona) => {
    // Live Stream Protection Guard:
    if (tenant?.is_live) {
      showToast('error', 'Live Stream Active: Persona cannot be changed while a stream or Premiere is live.');
      return;
    }

    const isStarter =
      (!subscriptionTier || subscriptionTier === 'starter') &&
      (!tenant?.subscription_tier || tenant.subscription_tier === 'starter');
    const isLockedBotBandya =
      (lockedBot.id || '').toLowerCase().includes('band') ||
      (lockedBot.persona_name || lockedBot.name || '').toLowerCase().includes('band');

    // Prevent Form Submission with Locked Personas under Starter tier
    if (isStarter && !isLockedBotBandya) {
      showToast('error', 'Starter plan only includes Bandya. Please select Bandya to continue.');
      return;
    }

    setSelectedBot(lockedBot);
    const targetBotId = lockedBot.channel_id || lockedBot.id;

    if (user?.id) {
      try {
        await saveBotConfig(user.id, { active_persona_id: lockedBot.id });
        await updateTenant(user.id, { active_bot_id: targetBotId });
      } catch (err) {
        console.error('Failed to persist locked persona:', err);
      }
    }
    showToast(
      'success',
      `${lockedBot.persona_name || lockedBot.name} locked for ${tenant?.name || 'your channel'}!`
    );
    setStep('mod');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080808] overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="step-welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full min-h-screen"
          >
            <Step1Welcome
              onContinue={() => setStep('channel')}
              showToast={showToast}
            />
          </motion.div>
        )}

        {step === 'channel' && (
          <motion.div
            key="step-channel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full min-h-screen"
          >
            <StepSelectChannel
              onChannelSelected={handleChannelSelected}
              showToast={showToast}
              onSignOut={logout}
            />
          </motion.div>
        )}

        {step === 'persona' && (
          <motion.div
            key="step-persona"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full min-h-screen"
          >
            <Step2Persona
              selectedBot={selectedBot}
              onSelectBot={setSelectedBot}
              onLockConfirmed={handleLockPersona}
              streamerPlan={subscriptionTier || tenant?.subscription_tier || 'starter'}
              showToast={showToast}
            />
          </motion.div>
        )}

        {step === 'mod' && (
          <motion.div
            key="step-mod"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full min-h-screen"
          >
            <Step3ModWizard
              selectedBot={selectedBot}
              showToast={showToast}
              onVerified={() => setStep('plan')}
              onSkip={() => {
                showToast('info', 'Skipped moderator verification');
                setStep('plan');
              }}
            />
          </motion.div>
        )}

        {step === 'plan' && (
          <motion.div
            key="step-plan"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full min-h-screen"
          >
            <Step4PlanSelect
              showToast={showToast}
              onPlanActivated={() => {
                const isBandya =
                  !selectedBot ||
                  (selectedBot.id || '').toLowerCase().includes('band') ||
                  (selectedBot.persona_name || selectedBot.name || '').toLowerCase().includes('band');
                const botHandle =
                  selectedBot?.handle?.replace(/^@/, '') || (isBandya ? 'bandya-hoon' : 'bhola-hoon');
                const botAvatarUrl =
                  selectedBot?.avatar_url ||
                  (isBandya
                    ? 'https://yt3.googleusercontent.com/HrV877shV7Oap0w_w7K2fPr61P360G-tS4R3iygAmG0poP36sjpwY5tcOb7XAUc5du_VcLjjLw=s900-c-k-c0x00ffffff-no-rj'
                    : 'https://yt3.googleusercontent.com/S0kWdOzASqg9XIGURD4aIqtAZaLIyv0MZSS-G2ZkXe434bn7N5KyfhtyVqgC90ghq36P9y8H=s900-c-k-c0x00ffffff-no-rj');
                const personaToPass: Persona = {
                  id: (selectedBot?.id as any) || 'bandya',
                  name: isBandya
                    ? 'Bandya'
                    : selectedBot?.persona_name || selectedBot?.name || 'Bandya',
                  handle: botHandle,
                  avatar_url: botAvatarUrl,
                  avatarUrl: botAvatarUrl,
                  avatarEmoji: '',
                  tagline: isBandya
                    ? 'The Stressed Comedic Crybaby'
                    : selectedBot?.tagline || 'The Stressed Comedic Crybaby',
                  sampleDialogues: isBandya
                    ? ['Maalik ek baat kahun? Aap ek number ke kameenay ho...😭']
                    : selectedBot?.sample_dialogues || selectedBot?.signature_slangs || [],
                  specialtyTags: isBandya
                    ? ['#DramaKing', '#OverStressed', '#CowardRoaster']
                    : selectedBot?.traits || [],
                };
                try {
                  localStorage.setItem('bhola_active_persona', JSON.stringify(personaToPass));
                } catch {}
                onComplete(personaToPass);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
