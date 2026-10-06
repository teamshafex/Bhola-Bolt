import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Sparkles, Crown, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import {
  SubscriptionTier,
  PlanConfig,
  fetchPlans,
  planRowToPlanConfig,
} from '@bhola/database';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier | string;
  onSelectPlanForCheckout: (plan: PlanConfig) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectPlanForCheckout,
}) => {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Dynamically load live plans from Supabase and sync with real-time admin changes
  useEffect(() => {
    if (!isOpen) return;
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
        }
      } catch (err) {
        console.warn('[PricingModal] Failed to fetch live plans:', err);
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
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = plans.find((p) => p.id === currentTier);
  const currentPrice = currentPlan ? currentPlan.priceUsd : 0;

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
    <AnimatePresence>
      <div
        id="pricing-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-7xl bg-[#111111] border border-[#27272a] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col my-auto max-h-[92vh] overflow-y-auto text-left"
        >
          {/* Close button */}
          <button
            id="btn-close-pricing-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#71717a] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Subscription &amp; Plans</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#fafafa] tracking-tight">
              Upgrade Your Stream Co-Host
            </h2>
            <p className="text-xs sm:text-sm text-[#a1a1aa] mt-2 leading-relaxed">
              Unlock ambient unprompted banter, custom slang learning, and high-frequency token quotas.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
              <p className="text-sm text-zinc-400 font-mono">Loading live tiers from registry...</p>
            </div>
          ) : (
            /* Cards Grid */
            <div className={`grid grid-cols-1 md:grid-cols-2 ${plans.length >= 4 ? 'xl:grid-cols-4' : plans.length === 3 ? 'xl:grid-cols-3' : ''} gap-5 mb-8`}>
              {plans.map((p) => {
                const isCurrent = p.id === currentTier;
                const isHigher = p.priceUsd > currentPrice;
                const isPopular = (p.badge || '').toLowerCase().includes('popular') || p.id === 'pro';
                const isEnterprise = (p.badge || '').toLowerCase().includes('vip') || p.id === 'enterprise';

                return (
                  <div
                    key={p.id}
                    id={`pricing-card-${p.id}`}
                    className={`relative rounded-2xl p-6 flex flex-col justify-between border transition-all duration-200 bg-zinc-900/60 ${
                      isCurrent
                        ? 'border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/30'
                        : isEnterprise
                        ? 'border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.06)]'
                        : isPopular
                        ? 'border-orange-500/40 hover:border-orange-500/70 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                        : 'border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {/* Badge */}
                    {isCurrent ? (
                      <div className="absolute -top-3 right-5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-xs">
                          Current Plan
                        </span>
                      </div>
                    ) : p.badge ? (
                      <div className="absolute -top-3 right-5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-xs ${
                            isEnterprise
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : isPopular
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>
                    ) : null}

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

                      {/* Price */}
                      <div className="my-4 pb-4 border-b border-zinc-800">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-white">
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

                      {/* Token Quota Box */}
                      <div className="bg-zinc-950/60 rounded-xl p-3 mb-4 border border-zinc-800/80 flex items-center justify-between">
                        <span className="text-xs text-[#a1a1aa] font-medium">Monthly Tokens</span>
                        <span className={`text-sm font-bold font-mono ${isEnterprise ? 'text-amber-400' : 'text-[#fafafa]'}`}>
                          {p.tokensPerMonth.toLocaleString()}
                        </span>
                      </div>

                      {/* Features list */}
                      <div className="flex flex-col gap-2.5 mb-6">
                        {p.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-[#d4d4d8]">
                            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isEnterprise ? 'text-amber-400' : 'text-orange-400'}`} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30 cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-orange-400" />
                          <span>Current Plan Active</span>
                        </button>
                      ) : isHigher ? (
                        <button
                          id={`btn-upgrade-${p.id}`}
                          onClick={() => onSelectPlanForCheckout(p)}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isEnterprise
                              ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_18px_rgba(245,158,11,0.25)] hover:shadow-[0_0_24px_rgba(245,158,11,0.4)]'
                              : 'bg-orange-500 hover:bg-orange-600 text-black shadow-[0_0_18px_rgba(249,115,22,0.25)] hover:shadow-[0_0_24px_rgba(249,115,22,0.4)]'
                          }`}
                        >
                          <span>Upgrade to {p.planName}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          id={`btn-downgrade-${p.id}`}
                          onClick={() => onSelectPlanForCheckout(p)}
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white border border-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Downgrade</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Note */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#71717a] pt-3 border-t border-zinc-800">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Instant activation. Real-time token deduction via Bhola token ledger.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
