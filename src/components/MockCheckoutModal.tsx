import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CreditCard,
  Smartphone,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PlanConfig,
  SubscriptionTier,
} from '@bhola/database';

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: PlanConfig | null;
  onSuccess: () => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const MockCheckoutModal: React.FC<MockCheckoutModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  onSuccess,
  showToast,
}) => {
  // Defensive guard: safely obtain auth context without throwing
  const auth = useAuth();
  const updateSubscription = auth?.updateSubscription;
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'jazzcash'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);

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

  if (!isOpen || !targetPlan) return null;

  const handleConfirm = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (updateSubscription) {
        await updateSubscription(targetPlan.id as SubscriptionTier, targetPlan.tokensPerMonth);
      } else {
        try {
          localStorage.setItem('bhola_subscription_tier', targetPlan.id);
        } catch {}
      }

      showToast(
        'success',
        `Successfully subscribed to ${targetPlan.planName}! ${targetPlan.tokensPerMonth.toLocaleString()} tokens activated.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast('error', 'Failed to update subscription. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        id="mock-checkout-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[#111111] border border-[#27272a] rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col my-auto text-left"
        >
          {/* Close button */}
          <button
            id="btn-close-checkout-modal"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#71717a] hover:text-white hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Checkout Summary</h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              Select a payment method to activate your subscription tier.
            </p>
          </div>

          {/* Test Mode Badge */}
          <div className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-amber-200/90 font-medium">
              Test Mode Active — No real charges will be made.
            </span>
          </div>

          {/* Order Summary Box */}
          <div className="bg-[#18181b]/70 border border-[#27272a] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
              <div>
                <span className="text-sm font-bold text-white">{targetPlan.planName} Subscription</span>
                <p className="text-xs text-[#71717a]">{targetPlan.tokensPerMonth.toLocaleString()} tokens / month</p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-white">
                  {targetPlan.priceUsd === 0 ? 'Free' : `$${targetPlan.priceUsd}`}
                </span>
                {targetPlan.pricePkr > 0 && (
                  <p className="text-[11px] font-mono text-[#f97316]">
                    PKR {targetPlan.pricePkr.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 text-xs">
              <span className="text-[#a1a1aa]">Billing Period</span>
              <span className="font-medium text-zinc-300">Monthly (Auto-renews)</span>
            </div>
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-[#a1a1aa]">Total Due Today</span>
              <span className="font-bold text-white font-mono">
                {targetPlan.priceUsd === 0 ? '$0.00' : `$${targetPlan.priceUsd}.00 USD`}
              </span>
            </div>
          </div>

          {/* Payment Method Radio Selection */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-[#fafafa] uppercase tracking-wider block mb-3">
              Payment Method (Simulated)
            </label>

            <div className="flex flex-col gap-2.5">
              {/* Method 1: Stripe */}
              <div
                id="payment-method-stripe"
                onClick={() => setPaymentMethod('stripe')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'stripe'
                    ? 'bg-[#1c0a00]/40 border-[#f97316] shadow-sm'
                    : 'bg-[#181818] border-[#272727] hover:border-[#3a3a3a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#222] text-[#f97316]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Credit/Debit Card (Stripe Test)
                    </div>
                    <div className="text-[11px] text-[#71717a]">
                      Simulated 4242 •••• •••• 4242
                    </div>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'stripe'
                      ? 'border-[#f97316] bg-[#f97316]'
                      : 'border-zinc-600'
                  }`}
                >
                  {paymentMethod === 'stripe' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#080808]" />
                  )}
                </div>
              </div>

              {/* Method 2: JazzCash / Easypaisa */}
              <div
                id="payment-method-jazzcash"
                onClick={() => setPaymentMethod('jazzcash')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                  paymentMethod === 'jazzcash'
                    ? 'bg-[#1c0a00]/40 border-[#f97316] shadow-sm'
                    : 'bg-[#181818] border-[#272727] hover:border-[#3a3a3a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#222] text-[#22c55e]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      JazzCash / Easypaisa (Direct)
                    </div>
                    <div className="text-[11px] text-[#71717a]">
                      Local Pakistani Mobile Wallet Simulator
                    </div>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'jazzcash'
                      ? 'border-[#f97316] bg-[#f97316]'
                      : 'border-zinc-600'
                  }`}
                >
                  {paymentMethod === 'jazzcash' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#080808]" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            id="btn-confirm-checkout"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full h-12 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-[#080808] font-bold text-sm
                       flex items-center justify-center gap-2 transition-all duration-150
                       shadow-[0_0_24px_rgba(249,115,22,0.25)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Simulated Payment...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Confirm &amp; Activate Subscription</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
