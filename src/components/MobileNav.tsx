import React from 'react';
import { LayoutDashboard, Sparkles, Users, History, Settings } from 'lucide-react';
import { NavTab } from '../types';

interface MobileNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onTabChange }) => {
  const items: { id: NavTab; icon: React.FC<{ className?: string }>; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'personas', icon: Sparkles, label: 'Personas' },
    { id: 'audience', icon: Users, label: 'Audience Matrix' },
    { id: 'history', icon: History, label: 'Session History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-[#111111] border-t border-[#262626] z-50 grid grid-cols-5 select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            id={`mobile-nav-${item.id}`}
            onClick={() => onTabChange(item.id)}
            aria-label={item.label}
            className="relative flex flex-col items-center justify-center gap-1 transition-colors"
          >
            {isActive && (
              <div className="w-6 h-0.5 bg-[#f97316] rounded-full absolute top-0" />
            )}
            <Icon
              className={`w-5 h-5 transition-colors ${
                isActive ? 'text-[#f97316]' : 'text-[#52525b]'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
};
