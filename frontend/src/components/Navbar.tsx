import React from 'react';
import {
  Navigation,
  Box,
  Split,
  HelpCircle,
  Sun,
  Moon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { PlanResponse } from '../types';

export type NavTab = 'planner' | 'simulator' | 'scenarios' | 'guide';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activePlan: PlanResponse | null;
  batteryPct?: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  activePlan,
  batteryPct = 85.0,
  theme,
  onToggleTheme
}) => {
  const tabs = [
    { id: 'planner' as NavTab, label: 'Flight Planner', icon: Navigation },
    { id: 'simulator' as NavTab, label: '3D Airspace', icon: Box },
    { id: 'scenarios' as NavTab, label: 'What-If Scenarios', icon: Split },
    { id: 'guide' as NavTab, label: 'How to Use & Purpose', icon: HelpCircle },
  ];

  const isSafe = activePlan ? activePlan.success && activePlan.safety_audit?.is_safe : true;
  const remainingSoc = activePlan?.remaining_soc_pct ?? batteryPct;

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 transition-colors duration-200 select-none">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-black text-white dark:bg-white dark:text-black font-bold text-sm tracking-wider">
          AE
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              AERON
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400">
              AO* ENGINE
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
            Autonomous Aerial Flight Planner
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: Battery, Status & Theme Switcher */}
      <div className="flex items-center gap-3">
        {/* Battery Telemetry */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 font-mono text-xs">
          {isSafe ? (
            <CheckCircle className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          )}
          <span className="text-neutral-500 dark:text-neutral-400">SoC:</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {remainingSoc.toFixed(0)}%
          </span>
        </div>

        {/* Theme Toggle Button (Light/Dark White/Black) */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to White mode' : 'Switch to Black mode'}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
