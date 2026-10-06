import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { updateTenant } from '@bhola/database';

import { sanitizeClientError, MAINTENANCE_MESSAGE } from '../../lib/errorSanitizer';

interface Step1WelcomeProps {
  onContinue: () => void;
  showToast?: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const Step1Welcome: React.FC<Step1WelcomeProps> = ({ onContinue, showToast }) => {
  const { loginWithYouTube, isConfigured, tenant, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>(() => {
    if (tenant?.gender === 'female' || tenant?.gender === 'male') {
      return tenant.gender as 'male' | 'female';
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bhola_streamer_gender');
      if (stored === 'female' || stored === 'male') return stored;
    }
    return 'male';
  });

  const handleGenderToggle = async (selectedGender: 'male' | 'female') => {
    setGender(selectedGender);
    try {
      localStorage.setItem('bhola_streamer_gender', selectedGender);
    } catch {}
    const targetId = user?.id || tenant?.id;
    if (targetId) {
      try {
        await updateTenant(targetId, { gender: selectedGender });
      } catch (e) {
        console.warn('Failed to update tenant gender:', e);
      }
    }
  };

  const handleYouTubeLogin = async () => {
    try {
      localStorage.setItem('bhola_streamer_gender', gender);
    } catch {}

    if (!isConfigured) {
      if (showToast) {
        showToast('error', MAINTENANCE_MESSAGE);
      }
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithYouTube();
    if (res.error) {
      setIsSubmitting(false);
      if (showToast) {
        showToast('error', sanitizeClientError(res.error));
      }
    }
    // If no error, the user is redirected to Google OAuth
  };

  return (
    <div
      id="onboarding-step-1"
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-[#080808] overflow-hidden"
    >
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-[#f97316] opacity-[0.03] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center text-center"
      >
        {/* Bhola Wordmark Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-5 h-5 bg-[#f97316] rounded-sm shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
          <span className="font-black text-4xl tracking-tighter text-[#fafafa]">BHOLA</span>
        </div>

        {/* Tagline */}
        <div className="flex flex-col gap-1.5 mb-6">
          <h1 className="text-2xl font-semibold text-[#fafafa] tracking-tight">
            Your Stream's Desi Co-Host.
          </h1>
          <p className="text-base text-[#a1a1aa]">
            Real-time roasts. Smart banter. Zero boring.
          </p>
        </div>

        {/* Horizontal Divider */}
        <div className="w-full max-w-xs h-px bg-[#262626] my-6" />

        {/* Value Prop Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="bg-[#111111] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-[#a1a1aa] whitespace-nowrap">
            ● Live &amp; Premiere Support
          </span>
          <span className="bg-[#111111] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-[#a1a1aa] whitespace-nowrap">
            ● Zero Ban Dual-Account Architecture
          </span>
          <span className="bg-[#111111] border border-[#262626] rounded-full px-4 py-1.5 text-xs text-[#a1a1aa] whitespace-nowrap">
            ● Zero API Quota Ingestion
          </span>
        </div>

        {/* Streamer Gender Selector */}
        <div className="w-full max-w-sm mb-6 p-3.5 rounded-xl bg-[#111111] border border-[#262626] text-left shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-[#fafafa] flex items-center gap-1.5">
              <span>Your Streamer Identity</span>
            </label>
            <span className="text-[10px] text-[#71717a] font-mono">Urdu/Punjabi Grammar</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#18181b] border border-[#262626]">
            <button
              type="button"
              id="btn-onboarding-gender-male"
              onClick={() => handleGenderToggle('male')}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                gender === 'male'
                  ? 'bg-[#f97316] text-[#080808] font-bold shadow'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <span>♂ Male Host</span>
            </button>
            <button
              type="button"
              id="btn-onboarding-gender-female"
              onClick={() => handleGenderToggle('female')}
              className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                gender === 'female'
                  ? 'bg-pink-500 text-white font-bold shadow'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <span>♀ Female Host</span>
            </button>
          </div>
          <p className="text-[11px] text-[#71717a] mt-2 leading-tight">
            Ensures your co-host addresses you with correct Urdu/Punjabi grammar.
          </p>
        </div>

        {/* Primary CTA Button */}
        <button
          id="btn-continue-youtube"
          onClick={handleYouTubeLogin}
          disabled={isSubmitting || !isConfigured}
          className="w-full max-w-sm h-12 rounded-lg bg-[#f97316] text-[#080808] font-semibold text-base
                     flex items-center justify-center gap-2 hover:bg-[#ea580c] transition-all duration-150
                     shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Redirecting to YouTube...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Continue with YouTube</span>
            </>
          )}
        </button>

        {/* Sleek branded notice if backend is unconfigured or undergoing maintenance */}
        {!isConfigured && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm text-left flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-[#a1a1aa]">
              <span className="font-semibold text-amber-400 block mb-0.5">Co-Host Services Updating</span>
              Our servers are currently undergoing brief maintenance. Please check back shortly.
            </div>
          </div>
        )}

        {/* Platform Service Terms & Legal Compliance Disclaimer */}
        <div className="mt-4 p-3 bg-surface/50 border border-border/40 rounded-lg text-xs text-text-muted/70 text-left max-w-sm leading-relaxed flex items-start gap-2.5">
          <span className="shrink-0 text-sm">⚖️</span>
          <div>
            <span className="font-semibold text-text-secondary">Platform Service Notice:</span>{' '}
            AI co-host personas, voices, and underlying models may be updated, temporarily suspended, or retired in compliance with YouTube Live Community Guidelines, copyright standards, or operational maintenance.
          </div>
        </div>

        {/* Disclaimer Text */}
        <p className="text-xs text-[#52525b] text-center mt-3 max-w-xs">
          By continuing, you agree to our Terms of Service and authorize YouTube channel read access.
        </p>
      </motion.div>

      {/* Version Tag */}
      <div className="absolute bottom-4 right-4 text-xs font-mono text-[#52525b]">
        v2.0
      </div>
    </div>
  );
};
