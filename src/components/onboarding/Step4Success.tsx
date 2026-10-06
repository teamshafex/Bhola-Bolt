import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Persona } from '../../types';

interface Step4SuccessProps {
  lockedPersona: Persona;
  onEnterDashboard: () => void;
}

export const Step4Success: React.FC<Step4SuccessProps> = ({
  lockedPersona,
  onEnterDashboard,
}) => {
  return (
    <div
      id="onboarding-step-4"
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-[#080808] overflow-hidden"
    >
      {/* Background warm radial glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-[#f97316] opacity-[0.035] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
        {/* Animated Success Icon with glow behind */}
        <div className="relative flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-[#f97316]/10 blur-xl absolute -z-10" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.15, 1] }}
            transition={{
              duration: 0.45,
              times: [0, 0.7, 1],
              ease: [0.34, 1.56, 0.64, 1],
            }}
          >
            <CheckCircle2 className="w-18 h-18 text-[#f97316] stroke-[2]" />
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-[#fafafa] mt-6 tracking-tight">
          Bhola is Ready.
        </h2>

        {/* Subtitle */}
        <p className="text-base text-[#a1a1aa] mt-2 leading-relaxed">
          Your stream's new co-host is standing by. Go live and watch the roasts begin.
        </p>

        {/* Persona Badge */}
        <div className="mt-6 bg-[#1c0a00] border border-[#f97316]/50 rounded-full px-4 py-2 inline-flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#f97316]" />
          <span className="text-xs font-semibold text-[#f97316] font-mono tracking-wide">
            {lockedPersona.name} — Locked
          </span>
        </div>

        {/* Primary CTA */}
        <button
          id="btn-enter-dashboard"
          onClick={onEnterDashboard}
          className="w-full h-12 rounded-lg bg-[#f97316] text-[#080808] font-semibold text-base
                     flex items-center justify-center gap-2 mt-8 hover:bg-[#ea580c] transition-colors duration-150
                     shadow-[0_0_24px_rgba(249,115,22,0.25)] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
        >
          <span>Enter Dashboard →</span>
        </button>
      </div>
    </div>
  );
};
