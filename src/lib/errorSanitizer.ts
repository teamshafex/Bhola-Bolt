/**
 * Global Client Error Sanitizer for Bhola Preview Kit.
 */

export const MAINTENANCE_MESSAGE =
  'Co-Host Services Updating: Our servers are currently undergoing brief maintenance. Please check back shortly.';

export const CHANNEL_ERROR_MESSAGE =
  'We were unable to connect with your YouTube account. Please verify your Google account has an active YouTube channel and try again.';

export const DEFAULT_ERROR_MESSAGE =
  'Unable to complete request. Please try again or refresh the page.';

export const AUTH_EXPIRED_MESSAGE =
  'Authentication session expired. Please sign in again.';

export const RATE_LIMIT_MESSAGE =
  'Daily limit reached. Please check your plan limits or try again later.';

const TECH_PATTERNS: RegExp[] = [
  /\b(42\d{3}|23\d{3}|pgrst\w*|42p\d{2}|28\d{3}|28p\d{2})\b/i,
  /\b(postgres|postgresql|supabase|postgrest|rls|row-level security|schema|relation|foreign key|constraint violation)\b/i,
  /\b(tenants|bot_accounts|bot_configs|audience_matrix|token_ledger|system_settings|personas|plans|active_bot_id|is_moderator_verified|pending_live_verification)\b/i,
  /\b(vite_[a-z0-9_]+|\.env[a-z0-9_.]*|ya29\.[a-z0-9_-]+|refresh_token|access_token|client_secret|bearer\s+[a-z0-9_-]+|anon_key|service_role)\b/i,
  /\b(google cloud|oauth consent|apis & services|cloud console|youtube\.readonly|youtube\.force-ssl|data api v3)\b/i,
  /\b([a-z]:\\[^"'\n]+|\/(?:apps|packages|services|src|node_modules)\/[^\s"']+|\.tsx?:\d+|\.jsx?:\d+)\b/i,
  /\b(typeerror|referenceerror|syntaxerror|unhandledrejection|failed to fetch)\b/i,
];

export function sanitizeClientError(error: unknown, fallbackMessage?: string): string {
  if (!error) {
    return fallbackMessage || DEFAULT_ERROR_MESSAGE;
  }

  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object') {
    const errObj = error as Record<string, unknown>;
    rawMessage = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(error);
  }

  const trimmed = rawMessage.trim();
  if (!trimmed) {
    return fallbackMessage || DEFAULT_ERROR_MESSAGE;
  }

  const hasLeak = TECH_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (hasLeak) {
    return fallbackMessage || DEFAULT_ERROR_MESSAGE;
  }

  return trimmed;
}
