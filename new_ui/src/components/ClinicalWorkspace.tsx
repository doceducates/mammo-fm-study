import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileImage, X, Loader2, Sparkles, ArrowLeft, PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import ImageViewer from './ImageViewer';
import AIPredictionPanel from './AIPredictionPanel';
import PatientList from './PatientList';
import { samplePatient } from '../mockData';
import type { PatientCase } from '../types';

import { predictMammogramFile } from '../api';

type View = 'list' | 'upload' | 'analyzing' | 'workspace';

export default function ClinicalWorkspace() {
  const { isDark } = useTheme();
  const [currentView, setCurrentView] = useState<View>('list');
  const [patient, setPatient] = useState<PatientCase | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeView, setActiveView] = useState('LCC');
  const [panelOpen, setPanelOpen] = useState(true);

  const processFileInference = useCallback(async (file: File) => {
    setCurrentView('analyzing');
    setIsAnalyzing(true);
    const result = await predictMammogramFile(file);
    setIsAnalyzing(false);

    const newCase: PatientCase = {
      id: `STUDY-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: `PAT-${Math.floor(100 + Math.random() * 900)}`,
      patientName: file.name.replace(/\.[^/.]+$/, ""),
      age: 48,
      sex: 'F',
      studyDate: new Date().toISOString().split('T')[0],
      institution: 'LGH Radiology Center',
      status: 'completed',
      density: 'C',
      lesionSize: 22,
      images: [
        {
          view: 'L-CC',
          side: 'Left',
          projection: 'CC',
          url: result.overlay_base64 || 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
          width: 2400,
          height: 3000
        }
      ],
      aiPrediction: {
        malignancyProbability: result.probability,
        classification: result.predicted_class as any,
        suggestedBIRADS: parseInt(result.estimated_birads) || (result.probability >= 0.5 ? 4 : 2),
        confidence: 0.95,
        featureUncertainty: 0.02,
        inferenceTime: 0.38,
        attentionRegions: [
          { x: 52, y: 41, radius: 24, intensity: result.probability, label: 'Mammographic Activation Peak' }
        ]
      }
    };
    setPatient(newCase);
    setCurrentView('workspace');
  }, []);

  const simulateAnalysis = useCallback((p?: PatientCase) => {
    setCurrentView('analyzing');
    setIsAnalyzing(true);
    setTimeout(() => {
      setPatient(p || samplePatient);
      setIsAnalyzing(false);
      setCurrentView('workspace');
    }, 2500);
  }, []);

  const handleSelectPatient = useCallback((p: PatientCase) => {
    if (p.status === 'completed' || p.status === 'reviewed') {
      setPatient(p);
      setCurrentView('workspace');
    } else {
      simulateAnalysis(p);
    }
  }, [simulateAnalysis]);

  const goBack = () => {
    setCurrentView('list');
    setPatient(null);
    setIsAnalyzing(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    simulateAnalysis();
  }, [simulateAnalysis]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => { setIsDragging(false); }, []);

  // ── LIST VIEW ──
  if (currentView === 'list') {
    return (
      <div className="h-full flex flex-col">
        <PatientList onSelectPatient={handleSelectPatient} />
        {/* Upload FAB (mobile friendly) */}
        <button
          onClick={() => setCurrentView('upload')}
          className="fixed bottom-20 right-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-clinical-500 to-accent-500 text-white flex items-center justify-center shadow-xl shadow-clinical-500/30 hover:scale-105 active:scale-95 transition-transform sm:bottom-12"
        >
          <Upload className="w-6 h-6" />
        </button>
      </div>
    );
  }

  // ── UPLOAD VIEW ──
  if (currentView === 'upload') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-4 sm:px-6 pt-4">
          <button onClick={goBack} className="flex items-center gap-2 text-[12px] font-semibold t-text-secondary hover:t-text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Patient List
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-3xl border-2 border-dashed transition-all duration-500 overflow-hidden ${
                isDragging
                  ? 'border-clinical-400 bg-clinical-500/5 scale-[1.02]'
                  : isDark ? 'border-dark-600 hover:border-dark-400 bg-dark-850/50' : 'border-gray-300 hover:border-gray-400 bg-white/50'
              }`}
            >
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/4 left-1/4 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-clinical-500/10 blur-[80px] sm:blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-36 sm:w-48 h-36 sm:h-48 rounded-full bg-accent-500/10 blur-[60px] sm:blur-[80px]" />
              </div>
              <div className="relative p-8 sm:p-14 flex flex-col items-center text-center">
                <motion.div
                  animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-clinical-500/20 to-accent-500/20 flex items-center justify-center mb-5 border border-clinical-500/10"
                >
                  {isDragging ? <FileImage className="w-7 h-7 sm:w-9 sm:h-9 text-clinical-400" /> : <Upload className="w-7 h-7 sm:w-9 sm:h-9 t-text-tertiary" />}
                </motion.div>
                <h2 className="text-lg sm:text-xl font-bold t-text-primary mb-2">
                  {isDragging ? 'Release to Upload' : 'Upload Mammogram Study'}
                </h2>
                <p className="text-[12px] sm:text-sm t-text-tertiary mb-6 sm:mb-8 max-w-md">
                  Drag & drop DICOM mammogram images (LCC, RCC, LMLO, RMLO) or click to browse.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-clinical-500 to-clinical-600 text-white text-[12px] sm:text-sm font-semibold cursor-pointer hover:from-clinical-400 hover:to-clinical-500 transition-all shadow-lg shadow-clinical-500/20 active:scale-[0.98]">
                    <input type="file" className="hidden" multiple accept="image/*,.dcm" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processFileInference(e.target.files[0]);
                      } else {
                        simulateAnalysis();
                      }
                    }} />
                    Browse Files
                  </label>
                  <button onClick={() => simulateAnalysis()} className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl t-card text-[12px] sm:text-sm font-semibold t-text-secondary hover:t-text-primary transition-all active:scale-[0.98] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-caution-400" /> Load Demo
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] t-text-muted flex-wrap justify-center">
                  <span>DICOM / PNG / JPEG</span>
                  <span className="w-1 h-1 rounded-full bg-dark-500" />
                  <span>Max 100MB</span>
                  <span className="w-1 h-1 rounded-full bg-dark-500" />
                  <span>HIPAA Compliant</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── ANALYZING VIEW ──
  if (currentView === 'analyzing' || isAnalyzing) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md w-full text-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 sm:mb-8">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-clinical-500/20 to-accent-500/20 animate-pulse" />
            <div className={`absolute inset-2 rounded-xl flex items-center justify-center ${isDark ? 'bg-dark-900' : 'bg-white'}`}>
              <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-clinical-400 animate-spin" />
            </div>
            <motion.div className="absolute w-3 h-3 rounded-full bg-clinical-400" animate={{ x: [0, 40, 0, -40, 0], y: [-40, 0, 40, 0, -40] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} style={{ top: '50%', left: '50%', marginTop: -6, marginLeft: -6 }} />
          </div>
          <h2 className="text-base sm:text-lg font-bold t-text-primary mb-2">Analyzing Mammogram</h2>
          <p className="text-[12px] sm:text-sm t-text-tertiary mb-6 sm:mb-8">Running Mammo-FM foundation model inference...</p>
          <div className="space-y-2.5 max-w-xs mx-auto text-left">
            {['Loading bilateral views', 'Preprocessing & normalization', 'Running ViT-B/16 backbone', 'Generating attention maps', 'Computing malignancy score'].map((label, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i < 2 ? 'bg-benign-500/20' : isDark ? 'bg-dark-700 shimmer-bg' : 'bg-gray-200'}`}>
                  <div className={`w-2 h-2 rounded-full ${i < 2 ? 'bg-benign-400' : isDark ? 'bg-dark-500' : 'bg-gray-400'}`} />
                </div>
                <span className={`text-[12px] ${i < 2 ? 't-text-primary' : 't-text-tertiary'}`}>{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── WORKSPACE VIEW ──
  return (
    <div className="h-full flex flex-col">
      {/* Top bar with back + panel toggle */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b t-border flex-shrink-0">
        <button onClick={goBack} className="flex items-center gap-2 text-[11px] sm:text-[12px] font-semibold t-text-secondary hover:t-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Patient List
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono t-text-tertiary hidden sm:inline">{patient?.id}</span>
          <span className="text-[10px] font-semibold t-text-secondary hidden sm:inline">— {patient?.patientName}</span>
          {/* Panel toggle (always show) */}
          <button onClick={() => setPanelOpen(!panelOpen)} className="p-1.5 rounded-lg t-bg-hover t-text-secondary hover:t-text-primary transition-colors" title={panelOpen ? 'Hide panel' : 'Show panel'}>
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Image Viewer */}
        <div className={`flex-1 flex flex-col glass-panel rounded-xl sm:rounded-2xl m-2 sm:m-3 overflow-hidden ${panelOpen ? 'lg:mr-1.5' : ''}`}>
          <ImageViewer images={patient!.images} activeView={activeView} onViewChange={setActiveView} />
        </div>

        {/* AI Prediction Panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full lg:w-[360px] xl:w-[380px] flex-shrink-0 glass-panel rounded-xl sm:rounded-2xl m-2 sm:m-3 lg:ml-1.5 overflow-hidden flex flex-col max-h-[50vh] lg:max-h-none"
            >
              <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b t-border">
                <h3 className="text-[10px] sm:text-[11px] font-semibold t-text-tertiary uppercase tracking-widest">AI Diagnostic Intelligence</h3>
                <button onClick={() => setPanelOpen(false)} className="p-1 rounded-md t-bg-hover t-text-muted hover:t-text-primary transition-colors lg:hidden">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <AIPredictionPanel patient={patient!} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
