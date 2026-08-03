import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Microscope, Shield, FileText,
  Scan, Brain, Zap, Bell, User, Menu, X, SunMedium, MoonStar,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { NavigationTab } from '../types';

interface NavigationProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

const tabs = [
  { id: 'clinical' as NavigationTab, label: 'Clinical', full: 'Clinical Workspace', icon: Scan, desc: 'Diagnostic Analysis' },
  { id: 'research' as NavigationTab, label: 'Research', full: 'Research Cohort', icon: Microscope, desc: 'Batch Analytics' },
  { id: 'benchmark' as NavigationTab, label: 'Benchmark', full: 'Model Integrity', icon: Shield, desc: 'Benchmark Audit' },
  { id: 'synopsis' as NavigationTab, label: 'Synopsis', full: 'Synopsis Hub', icon: FileText, desc: 'UHS Thesis Hub' },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="relative z-50">
      {/* Top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-clinical-500/40 to-transparent" />

      <div className="glass-panel border-b t-border">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-clinical-500 to-accent-500 flex items-center justify-center shadow-lg shadow-clinical-500/20">
                  <Brain className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-benign-500 rounded-full border-2 border-dark-900 dark:border-dark-900 glow-pulse" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-[14px] sm:text-[15px] font-bold t-text-primary tracking-tight flex items-center gap-2">
                  Mammo-FM
                  <span className="text-[9px] sm:text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-accent-500/15 text-accent-400 border border-accent-500/20">v1.0</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] t-text-tertiary font-medium tracking-wider uppercase hidden sm:block">
                  AI Breast Cancer Foundation Model
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 t-bg-el rounded-2xl p-1 border t-border">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className="relative px-4 xl:px-5 py-2.5 rounded-xl transition-all duration-300 group"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-clinical-500/15 to-accent-500/10 rounded-xl border border-clinical-500/20"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative flex items-center gap-2">
                      <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-clinical-400' : 't-text-tertiary group-hover:t-text-secondary'}`} />
                      <div className="text-left">
                        <div className={`text-[12px] font-semibold transition-colors duration-300 ${isActive ? 't-text-primary' : 't-text-secondary'}`}>{tab.full}</div>
                        <div className="text-[9px] t-text-tertiary tracking-wider uppercase">{tab.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Right section */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* System Status - desktop */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg t-bg-el border t-border">
                <Zap className="w-3.5 h-3.5 text-benign-400" />
                <span className="text-[11px] font-medium text-benign-400">Online</span>
                <Activity className="w-3 h-3 text-benign-400 glow-pulse" />
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg t-bg-hover transition-colors"
                title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                {isDark ? <SunMedium className="w-4 h-4 text-caution-400" /> : <MoonStar className="w-4 h-4 text-accent-500" />}
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-lg t-bg-hover transition-colors hidden sm:block">
                <Bell className="w-4 h-4 t-text-tertiary" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-malignant-500 rounded-full" />
              </button>

              {/* User */}
              <button className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg t-bg-hover transition-colors">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-clinical-500/30 to-accent-500/30 flex items-center justify-center border t-border">
                  <User className="w-3.5 h-3.5 t-text-secondary" />
                </div>
                <span className="text-[11px] font-medium t-text-secondary hidden md:block">Dr. Khan</span>
              </button>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg t-bg-hover transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5 t-text-secondary" /> : <Menu className="w-5 h-5 t-text-secondary" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 w-72 z-50 glass-panel border-l t-border overflow-y-auto lg:hidden"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[14px] font-bold t-text-primary">Navigation</h2>
                  <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg t-bg-hover">
                    <X className="w-4 h-4 t-text-secondary" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-clinical-500/10 border border-clinical-500/20'
                            : 't-bg-hover border border-transparent'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-clinical-400' : 't-text-tertiary'}`} />
                        <div className="text-left">
                          <div className={`text-[13px] font-semibold ${isActive ? 't-text-primary' : 't-text-secondary'}`}>{tab.full}</div>
                          <div className="text-[10px] t-text-tertiary">{tab.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t t-border space-y-3">
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-clinical-500/30 to-accent-500/30 flex items-center justify-center border t-border">
                      <User className="w-4 h-4 t-text-secondary" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold t-text-primary">Dr. Amira Khan</p>
                      <p className="text-[10px] t-text-tertiary">Radiologist</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg t-bg-el">
                    <Zap className="w-3.5 h-3.5 text-benign-400" />
                    <span className="text-[11px] font-medium text-benign-400">Model Online</span>
                    <Activity className="w-3 h-3 text-benign-400 glow-pulse ml-auto" />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
