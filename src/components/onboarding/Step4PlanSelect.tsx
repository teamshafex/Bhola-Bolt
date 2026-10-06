import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Sparkles, Crown, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SubscriptionTier,
  fetchPlans,
  planRowToPlanConfig,
  PlanConfig,
} from '@bhola/database';

interface Step4PlanSelectProps {
  onPlanActivated: (tier: SubscriptionTier | string) => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const Step4PlanSelect: React.FC<Step4PlanSelectProps> = ({
  onPlanActivated,
  showToast,
}) => {
  const { updateSubscription } = useAuth();
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('starter');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActivating, setIsActivating] = useState<boolean>(false);

  // Dynamically load live plans from Supabase and sync with real-time admin changes
  useEffect(() => {
    let isMounted = true;

    async function loadLivePlans() {
      try {
        setIsLoading(true);
        const rows = await fetchPlans();
        if (isMounted && rows && rows.length > 0) {
          const publicConfigs = rows
            .filter((r) => r.is_public !== false)
            .sort((a, b) => Number(a.price_usd) - Number(b.price_usd))
            .map(planRowToPlanConfig);
          setPlans(publicConfigs);
          if (publicConfigs.length > 0) {
            setSelectedTier((prev) => {
              const stillExists = publicConfigs.some((p) => p.id === prev);
              return stillExists ? prev : publicConfigs[0].id;
            });
          }
        }
      } catch (err) {
        console.warn('[Step4PlanSelect] Failed to fetch live plans:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLivePlans();

    const handlePlansUpdated = () => {
      loadLivePlans();
    };

    window.addEventListener('bhola:plans-updated', handlePlansUpdated);
    window.addEventListener('storage', handlePlansUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('bhola:plans-updated', handlePlansUpdated);
      window.removeEventListener('storage', handlePlansUpdated);
    };
  }, []);

  const handleActivate = async () => {
    if (isActivating || !selectedTier) return;
    setIsActivating(true);

    const planConfig = plans.find((p) => p.id === selectedTier) || plans[0];
    const quotaToPass = planConfig ? planConfig.tokensPerMonth : 30000;

    try {
      await updateSubscription(selectedTier as SubscriptionTier, quotaToPass);

      try {
        localStorage.setItem('bhola_onboarded', 'true');
      } catch (err) {
        console.error('Failed to set localStorage', err);
      }

      showToast(
        'success',
        `${planConfig?.planName || 'Plan'} activated! ${quotaToPass.toLocaleString()} tokens ready.`
      );
      onPlanActivated(selectedTier);
    } catch (err: any) {
      console.error('Failed to activate plan:', err);
      showToast('error', 'Failed to save plan activation. Proceeding with default tier.');
      onPlanActivated(selectedTier);
    } finally {
      setIsActivating(false);
    }
  };

  const getTierIcon = (planId: string) => {
    const lower = planId.toLowerCase();
    if (lower.includes('enterprise') || lower.includes('vip')) {
      return <ShieldCheck className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('studio') || lower.includes('elite')) {
      return <Crown className="w-5 h-5 text-[#6366f1]" />;
    }
    if (lower.includes('pro') || lower.includes('creator')) {
      return <Sparkles className="w-5 h-5 text-orange-400" />;
    }
    return <Zap className="w-5 h-5 text-orange-400" />;
  };

  return (
    <div
      id="onboarding-step-4-plan"
      className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 bg-[#080808] overflow-y-auto"
    >
      {/* Progress Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
        <motion.div
          animate={{ scale: 1.25 }}
          className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]"
        />
      </div>

      <div className="w-full max-w-7xl flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-10">
          <span className="text-xs uppercase tracking-widest text-[#52525b] font-semibold">
            STEP 4 OF 4 • FINAL STEP
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#fafafa] mt-2 tracking-tight">
            Select Your Monthly Quota
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-2 max-w-xl mx-auto">
            Choose your AI token quota and live co-host frequency. Start free or unlock full studio automation.
          </p>
        </div>

        {/* Loading State */}
        {isLoading && plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
            <p className="text-sm text-zinc-400 font-mono">Loading available subscription tiers...</p>
          </div>
        ) : (
          /* Tier Cards Grid */
          <div className={`w-full grid grid-cols-1 md:grid-cols-2 ${plans.length >= 4 ? 'xl:grid-cols-4' : plans.length === 3 ? 'xl:grid-cols-3' : ''} gap-5 mb-10`}>
            {plans.map((p) => {
              const isSelected = selectedTier === p.id;
              const isPopular = (p.badge || '').toLowerCase().includes('popular') || p.id === 'pro';
              const isEnterprise = (p.badge || '').toLowerCase().includes('vip') || p.id === 'enterprise';

              return (
                <div
                  key={p.id}
                  id={`plan-card-${p.id}`}
                  onClick={() => setSelectedTier(p.id)}
                  className={`relative rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col justify-between border text-left bg-zinc-900/60
                    ${
                      isSelected
                        ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                        : isEnterprise
                        ? 'border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.06)]'
                        : isPopular
                        ? 'border-orange-500/40 hover:border-orange-500/70 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                        : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                >
                  {/* Badge if available */}
                  {p.badge && (
                    <div className="absolute -top-3 right-5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${
                          isEnterprise
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : isPopular
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : isSelected
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {p.badge}
                      </span>
                    </div>
                  )}

                  <div>
                    {/* Icon & Title */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 shrink-0">
                        {getTierIcon(p.id)}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">{p.planName}</h3>
                        <p className="text-xs text-[#71717a] line-clamp-1">{p.tagline}</p>
                      </div>
                    </div>

                    {/* Pricing Display */}
                    <div className="my-5 pb-5 border-b border-zinc-800">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold text-white">
                          {p.priceUsd === 0 ? 'Free' : `$${p.priceUsd}`}
                        </span>
                        {p.priceUsd > 0 && (
                          <span className="text-xs text-[#a1a1aa] font-medium">/ month</span>
                        )}
                      </div>
                      {p.pricePkr > 0 && (
                        <div className={`text-xs font-mono mt-1 ${isEnterprise ? 'text-amber-400' : 'text-[#f97316]'}`}>
                          ≈ PKR {p.pricePkr.toLocaleString()} / mo
                        </div>
                      )}
                      {p.priceUsd === 0 && (
                        <div className="mt-1">
                          <div className="text-xs text-orange-400 font-medium">
                            PKR 0 • No Card Required
                          </div>
                          <div className="text-[11px] text-[#71717a] font-mono mt-0.5">
                            List: PKR 699 ($2.49)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tokens Highlight */}
                    <div className="bg-zinc-950/60 rounded-xl p-3 mb-4 border border-zinc-800/80 flex items-center justify-between">
                      <span className="text-xs text-[#a1a1aa] font-medium">Monthly Tokens</span>
                      <span className={`text-sm font-bold font-mono ${isEnterprise ? 'text-amber-400' : 'text-[#fafafa]'}`}>
                        {p.tokensPerMonth.toLocaleString()}
                      </span>
                    </div>

                    {/* Feature Bullets */}
                    <div className="flex flex-col gap-2.5 mb-6">
                      {p.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#d4d4d8]">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isEnterprise ? 'text-amber-400' : 'text-orange-400'}`} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selection Radio / Indicator Button */}
                  <div className="pt-2">
                    <div
                      className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? isEnterprise
                            ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                            : 'bg-orange-500 hover:bg-orange-600 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                          : 'bg-[#1a1a1a] text-[#a1a1aa] hover:text-white border border-[#2a2a2a]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Selected Plan</span>
                        </>
                      ) : (
                        <span>Select {p.planName}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security / No Lock-In Guarantee Note */}
        <div className="flex items-center gap-2 text-xs text-[#71717a] mb-6">
          <ShieldCheck className="w-4 h-4 text-orange-400" />
          <span>Switch or upgrade your plan anytime from dashboard settings. Zero lock-in.</span>
        </div>

        {/* Primary CTA Button */}
        <button
          id="btn-launch-dashboard"
          onClick={handleActivate}
          disabled={isActivating || plans.length === 0}
          className="w-full max-w-md h-12 rounded-lg bg-[#f97316] text-[#080808] font-bold text-base
                     flex items-center justify-center gap-2 hover:bg-[#ea580c] transition-all duration-150
                     shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_32px_rgba(249,115,22,0.4)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
        >
          {isActivating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Configuring Your Dashboard...</span>
            </>
          ) : (
            <span>Launch Dashboard 🚀</span>
          )}
        </button>

        {/* Platform Service Terms & Legal Compliance Disclaimer */}
        <div className="mt-6 p-3 bg-surface/50 border border-border/40 rounded-lg text-xs text-text-muted/70 text-left max-w-md leading-relaxed flex items-start gap-2.5">
          <span className="shrink-0 text-sm">⚖️</span>
          <div>
            <span className="font-semibold text-text-secondary">Platform Service Notice:</span>{' '}
            AI co-host personas, voices, and underlying models may be updated, temporarily suspended, or retired in compliance with YouTube Live Community Guidelines, copyright standards, or operational maintenance.
          </div>
        </div>
      </div>
    </div>
  );
};
