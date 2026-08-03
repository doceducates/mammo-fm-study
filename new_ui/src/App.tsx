import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navigation from './components/Navigation';
import ClinicalWorkspace from './components/ClinicalWorkspace';
import ResearchCohort from './components/ResearchCohort';
import BenchmarkCenter from './components/BenchmarkCenter';
import { SynopsisCenter } from './components/SynopsisCenter';
import { useTheme } from './ThemeContext';
import type { NavigationTab } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('clinical');
  const { isDark } = useTheme();

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDark ? 'bg-dark-950' : 'bg-[#f3f5f9]'}`}>
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-0 left-1/4 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] rounded-full bg-clinical-500/[0.02] blur-[100px] sm:blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] rounded-full bg-accent-500/[0.02] blur-[80px] sm:blur-[120px]" />
            <div className="absolute top-1/2 left-0 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-teal-500/[0.01] blur-[80px] sm:blur-[100px]" />
            <div className="absolute inset-0 opacity-[0.015]" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',
              backgroundSize: '60px 60px',
            }} />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-1/4 w-[500px] sm:w-[800px] h-[300px] sm:h-[400px] rounded-full bg-clinical-500/[0.03] blur-[100px] sm:blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] rounded-full bg-accent-500/[0.03] blur-[80px] sm:blur-[120px]" />
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.04) 1px,transparent 1px)',
              backgroundSize: '60px 60px',
            }} />
          </>
        )}
      </div>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {activeTab === 'clinical' && <ClinicalWorkspace />}
            {activeTab === 'research' && <ResearchCohort />}
            {activeTab === 'benchmark' && <BenchmarkCenter />}
            {activeTab === 'synopsis' && (
              <div className="h-full overflow-y-auto p-6 max-w-[1920px] mx-auto">
                <SynopsisCenter />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      <footer className={`relative z-10 border-t t-border ${isDark ? 'bg-dark-950/80' : 'bg-white/80'} backdrop-blur-sm`}>
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 py-1 sm:py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 text-[8px] sm:text-[9px] t-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-benign-500 glow-pulse" />
              <span className="hidden sm:inline">GPU: NVIDIA A100 —</span> Online
            </span>
            <span className="hidden sm:inline">CUDA 12.1</span>
            <span className="hidden md:inline">PyTorch 2.1</span>
            <span className="hidden lg:inline">VRAM: 12.4 / 40 GB</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[8px] sm:text-[9px] t-text-muted">
            <span>Mammo-FM v1.0</span>
            <span className="hidden sm:inline">HIPAA Compliant</span>
            <span className="hidden md:inline">© 2024 Mammo-FM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
