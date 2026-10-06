import React, { useState } from 'react';
import { Zap, Copy, Check, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { ActiveBotPersona, updateTenant } from '@bhola/database';
import { useAuth } from '../../context/AuthContext';

interface Step3ModWizardProps {
  selectedBot?: ActiveBotPersona | null;
  onVerified: () => void;
  onSkip?: () => void;
  showToast: (type: 'info' | 'success' | 'error', msg: string) => void;
}

export const Step3ModWizard: React.FC<Step3ModWizardProps> = ({
  selectedBot,
  onVerified,
  showToast,
}) => {
  const { user, tenant } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activePersonaName = selectedBot?.persona_name || selectedBot?.name || 'Your Co-Host';
  const botName = activePersonaName;
  const rawHandle =
    selectedBot?.handle ||
    (selectedBot?.persona_name || selectedBot?.name
      ? `@${(selectedBot.persona_name || selectedBot.name).replace(/\s+/g, '')}Official`
      : '@CoHostOfficial');
  const cleanHandle = rawHandle.replace(/^@/, '');
  const botChannelUrl = `https://www.youtube.com/@${cleanHandle}`;
  const botChannelId = selectedBot?.channel_id || selectedBot?.id || '';

  const handleCopy = () => {
    navigator.clipboard?.writeText(botChannelUrl);
    setCopied(true);
    showToast('info', 'Copied channel link to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Handles non-blocking progression when streamer confirms adding moderator
  const handleContinue = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const streamerId = tenant?.id || user?.id || '';
      if (streamerId) {
        await updateTenant(streamerId, {
          active_bot_id: botChannelId,
          is_moderator_verified: false,
          pending_live_verification: true,
        }).catch((err) => console.warn('[Step3ModWizard] DB update note:', err));
      }

      localStorage.setItem(
        'bhola_streamer_mod_status',
        JSON.stringify({
          verified: false,
          pending_live_verification: true,
          botChannelId,
        })
      );

      showToast('info', 'Moderator configuration saved! We will verify when you go live.');
      onVerified();
    } catch (err: any) {
      console.warn('[Step3ModWizard] Continue error:', err);
      onVerified();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="onboarding-step-3"
      className="min-h-screen w-full flex flex-col items-center py-12 px-4 sm:px-6 bg-[#080808] overflow-y-auto"
    >
      {/* Progress Dots: dot 2 active */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
        <div className="w-2 h-2 rounded-full bg-[#262626]" />
      </div>

      <div className="w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest text-[#52525b] font-semibold">
            STEP 2 OF 3
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa] mt-2 tracking-tight">
            Add {botName} as Channel Moderator
          </h2>
          <p className="text-sm text-[#a1a1aa] mt-2 max-w-lg mx-auto">
            Required so {botName} bypasses YouTube's spam filter and chats freely.
          </p>
        </div>

        {/* Info Banner */}
        <div className="w-full bg-[#1c0a00] border-l-4 border-[#f97316] rounded-lg p-4 flex gap-3 my-4">
          <Zap className="w-5 h-5 text-[#f97316] shrink-0 mt-0.5" />
          <p className="text-sm text-[#a1a1aa] leading-relaxed">
            Without mod status, YouTube flags {botName}'s messages as spam and hides them from
            viewers. Moderator privilege removes this restriction permanently.
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="flex flex-col gap-3 mt-4">
          {/* Step 1 */}
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c0a00] border border-[#f97316]/40 flex items-center justify-center text-sm font-bold text-[#f97316] shrink-0">
              1
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#fafafa]">Open YouTube Studio</h4>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Go to studio.youtube.com and sign in to your channel account.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c0a00] border border-[#f97316]/40 flex items-center justify-center text-sm font-bold text-[#f97316] shrink-0">
              2
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#fafafa]">Go to Settings &gt; Community</h4>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Click Settings in the left sidebar, then select Community settings.
              </p>
            </div>
          </div>

          {/* Copy Channel Link Element between Step 2 and 3 */}
          <div className="bg-[#1c1c1c] border border-[#262626] rounded-lg px-4 py-3 flex items-center justify-between sm:ml-12 my-1 gap-3 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-xs sm:text-sm font-semibold text-[#f97316] truncate select-all">
                {botChannelUrl}
              </span>
            </div>
            <button
              id="btn-copy-bot-handle"
              onClick={handleCopy}
              className="shrink-0 border border-[#262626] rounded-md px-3 py-1.5 text-xs text-[#a1a1aa] flex items-center gap-1.5 hover:bg-white/5 hover:text-[#fafafa] transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-[#22c55e]" />
                  <span className="text-[#22c55e] font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c0a00] border border-[#f97316]/40 flex items-center justify-center text-sm font-bold text-[#f97316] shrink-0">
              3
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#fafafa]">Add Channel as Moderator</h4>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Paste the copied channel link in the "Managing Moderators" box and select the account.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-[#111111] border border-[#262626] rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#1c0a00] border border-[#f97316]/40 flex items-center justify-center text-sm font-bold text-[#f97316] shrink-0">
              4
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#fafafa]">Save Changes</h4>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                Click 'Save' at the bottom right of Community Settings. Done!
              </p>
            </div>
          </div>
        </div>

        {/* Moderator Access Notice Banner */}
        <div className="w-full mt-6 mb-4 rounded-xl border border-warning/30 bg-warning/10 p-4 flex items-start gap-3 text-text-primary shadow-sm">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed">
            <strong className="font-semibold text-white">Moderator Access Required:</strong>{' '}
            Add <strong className="font-semibold text-white">{botName}</strong> as a Standard Moderator in YouTube Studio to enable live chat responses.
          </div>
        </div>

        {/* Actions & Single Decisive Primary CTA */}
        <div className="mt-2 flex flex-col items-center">
          <button
            id="btn-confirm-moderator-continue"
            onClick={handleContinue}
            disabled={isSaving}
            className="w-full max-w-sm h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-[#f97316] text-[#080808] hover:bg-[#ea580c] transition-all duration-150 cursor-pointer shadow-[0_0_20px_rgba(249,115,22,0.35)] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#080808]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#080808]" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <span>I Have Added the Moderator → Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
