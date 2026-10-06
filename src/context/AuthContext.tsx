import React, { createContext, useContext, useState } from 'react';
import { SubscriptionTier, TenantRow } from '../lib/databaseShim';

interface AuthContextType {
  user: any | null;
  tenant: TenantRow | null;
  loading: boolean;
  isConfigured: boolean;
  providerToken: string | null;
  channels: any[];
  channelError: any | null;
  isLoadingChannels: boolean;
  subscriptionTier: SubscriptionTier;
  updateSubscription: (tier: SubscriptionTier, customQuota?: number) => Promise<TenantRow | null>;
  loginWithYouTube: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshTenant: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  selectChannel: (channel: any) => Promise<TenantRow | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('pro');

  const [tenant, setTenant] = useState<TenantRow>({
    id: 't_streamer_01',
    channel_id: 'UC_mock_streamer_01',
    channel_title: 'Ali Gaming',
    channel_handle: '@aligaming_live',
    avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    subscription_tier: 'pro',
    active_bot_id: 'bandya',
    onboarding_completed: true,
    tokens_used_this_month: 42500,
    messages_sent_today: 148,
  });

  const updateSubscription = async (tier: SubscriptionTier) => {
    setSubscriptionTier(tier);
    setTenant((prev) => ({ ...prev, subscription_tier: tier }));
    return tenant;
  };

  const logout = async () => {
    console.log('[Preview Mode] Mock logout triggered');
  };

  const loginWithYouTube = async () => {
    return {};
  };

  const refreshTenant = async () => {};
  const fetchChannels = async () => {};
  const selectChannel = async () => tenant;

  return (
    <AuthContext.Provider
      value={{
        user: { id: 'u_preview_01', email: 'streamer@bhola.ai' },
        tenant,
        loading: false,
        isConfigured: true,
        providerToken: 'mock_token',
        channels: [],
        channelError: null,
        isLoadingChannels: false,
        subscriptionTier,
        updateSubscription,
        loginWithYouTube,
        logout,
        refreshTenant,
        fetchChannels,
        selectChannel,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
