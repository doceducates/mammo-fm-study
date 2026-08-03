import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Shield, Clock, Target, TrendingUp,
  CheckCircle2, XCircle, ChevronDown, FileText, Download,
  Save, Printer, ArrowRight, X, Check
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { savePatientCase, downloadSPSSExport } from '../api';
import type { PatientCase } from '../types';

interface Props { patient: PatientCase; }

export default function AIPredictionPanel({ patient }: Props) {
  const { isDark } = useTheme();
  const [radiologistBirads, setRadiologistBirads] = useState(patient.radiologistAssessment?.birads || 0);
  const [histoStatus, setHistoStatus] = useState<string>(patient.histopathology?.status || 'Not Available');
  const [showReport, setShowReport] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveCase = async () => {
    const updatedCase = {
      ...patient,
      radiologistAssessment: radiologistBirads > 0 ? {
        birads: radiologistBirads,
        notes: patient.radiologistAssessment?.notes || 'Updated via panel',
        assessedBy: patient.radiologistAssessment?.assessedBy || 'Dr. Radiologist',
        assessedAt: new Date().toISOString()
      } : patient.radiologistAssessment,
      histopathology: {
        ...patient.histopathology,
        status: histoStatus as any
      }
    };
    await savePatientCase(updatedCase);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const pred = patient.aiPrediction;
  const isMalignant = pred.classification === 'Malignant';
  const probPercent = (pred.malignancyProbability * 100).toFixed(1);

  const getBiradsLabel = (b: number) => {
    const m: Record<number, string> = { 0: 'Not Assessed', 1: 'Negative', 2: 'Benign', 3: 'Probably Benign', 4: 'Suspicious', 5: 'Highly Suspicious', 6: 'Known Malignancy' };
    return m[b] || 'Unknown';
  };

  const agreement = radiologistBirads > 0 && ((radiologistBirads >= 4 && pred.suggestedBIRADS >= 4) || (radiologistBirads < 4 && pred.suggestedBIRADS < 4));

  const cardBg = isDark ? 'bg-dark-800/50 border-white/[0.03]' : 'bg-gray-50 border-gray-200/60';
  const selectBg = isDark ? 'bg-dark-800/50 border-white/[0.05] text-dark-100' : 'bg-white border-gray-200 text-gray-800';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Patient Info */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b t-border">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div>
            <h3 className="text-[12px] sm:text-[13px] font-semibold t-text-primary">{patient.patientName}</h3>
            <p className="text-[10px] t-text-tertiary font-mono mt-0.5">{patient.patientId} • {patient.age}y • {patient.sex}</p>
          </div>
          <div className={`px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold tracking-wide uppercase ${
            patient.status === 'completed' ? 'bg-benign-500/15 text-benign-400 border border-benign-500/20' :
            patient.status === 'analyzing' ? 'bg-caution-500/15 text-caution-400 border border-caution-500/20' :
            isDark ? 'bg-dark-600 text-dark-300 border-white/[0.05]' : 'bg-gray-100 text-gray-500 border-gray-200'
          } border`}>{patient.status}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`px-3 py-2 rounded-lg border ${cardBg}`}>
            <p className="text-[9px] t-text-muted uppercase tracking-wider">Study Date</p>
            <p className="text-[11px] sm:text-[12px] t-text-primary font-medium mt-0.5">{patient.studyDate}</p>
          </div>
          <div className={`px-3 py-2 rounded-lg border ${cardBg}`}>
            <p className="text-[9px] t-text-muted uppercase tracking-wider">Institution</p>
            <p className="text-[11px] sm:text-[12px] t-text-primary font-medium mt-0.5 truncate">{patient.institution}</p>
          </div>
        </div>
      </div>

      {/* Risk Score */}
      <div className="px-4 sm:px-5 py-4 sm:py-5 border-b t-border">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'} strokeWidth="6" />
              <motion.circle cx="50" cy="50" r="42" fill="none" stroke={isMalignant ? '#ef4444' : '#10b981'} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pred.malignancyProbability) }}
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span className={`text-[18px] sm:text-[22px] font-bold ${isMalignant ? 'text-malignant-400' : 'text-benign-400'}`}
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
                {probPercent}%
              </motion.span>
              <span className="text-[7px] sm:text-[8px] t-text-tertiary uppercase tracking-widest">Risk</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-[12px] font-bold ${
              isMalignant ? 'bg-malignant-500/15 text-malignant-400 border border-malignant-500/20' : 'bg-benign-500/15 text-benign-400 border border-benign-500/20'
            }`}>
              {isMalignant ? <AlertTriangle className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              {pred.classification}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] t-text-tertiary">AI BI-RADS:</span>
              <span className={`text-[12px] font-bold ${isMalignant ? 'text-malignant-400' : 'text-benign-400'}`}>Category {pred.suggestedBIRADS}</span>
            </div>
            <p className="text-[10px] t-text-muted mt-1">{getBiradsLabel(pred.suggestedBIRADS)}</p>
          </div>
        </div>
      </div>

      {/* Model Metrics */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b t-border">
        <h4 className="text-[10px] t-text-muted uppercase tracking-widest font-semibold mb-2 sm:mb-3">Model Confidence</h4>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { icon: Target, color: 'text-clinical-400', val: `${(pred.confidence * 100).toFixed(0)}%`, label: 'Confidence' },
            { icon: TrendingUp, color: 'text-accent-400', val: `${(pred.featureUncertainty * 100).toFixed(1)}%`, label: 'Uncertainty' },
            { icon: Clock, color: 'text-teal-400', val: `${pred.inferenceTime}s`, label: 'Inference' },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className={`px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg border text-center ${cardBg}`}>
                <Icon className={`w-3.5 h-3.5 ${m.color} mx-auto mb-1`} />
                <p className="text-[13px] sm:text-[14px] font-bold t-text-primary">{m.val}</p>
                <p className="text-[7px] sm:text-[8px] t-text-muted uppercase tracking-wider mt-0.5">{m.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attention Regions */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b t-border">
        <h4 className="text-[10px] t-text-muted uppercase tracking-widest font-semibold mb-2 sm:mb-3">Attention Regions</h4>
        <div className="space-y-1.5 sm:space-y-2">
          {pred.attentionRegions.map((r, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + idx * 0.1 }}
              className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer transition-all hover:border-clinical-500/20 ${cardBg}`}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.intensity > 0.8 ? '#ef4444' : r.intensity > 0.5 ? '#f59e0b' : '#10b981', boxShadow: `0 0 6px ${r.intensity > 0.8 ? 'rgba(239,68,68,.5)' : r.intensity > 0.5 ? 'rgba(245,158,11,.5)' : 'rgba(16,185,129,.5)'}` }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium t-text-primary truncate">{r.label}</p>
                <p className="text-[9px] font-mono t-text-muted">({r.x}%, {r.y}%)</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] font-mono font-semibold t-text-primary">{(r.intensity * 100).toFixed(0)}%</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Radiologist BI-RADS */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b t-border">
        <h4 className="text-[10px] t-text-muted uppercase tracking-widest font-semibold mb-2 sm:mb-3">Radiologist BI-RADS</h4>
        <div className="relative">
          <select value={radiologistBirads} onChange={e => setRadiologistBirads(Number(e.target.value))}
            className={`w-full px-3 py-2.5 rounded-lg border text-[12px] appearance-none cursor-pointer focus:outline-none focus:border-clinical-500/30 transition-colors ${selectBg}`}>
            <option value={0}>Select BI-RADS Category</option>
            {[1,2,3,4,5,6].map(b => <option key={b} value={b}>BI-RADS {b} — {getBiradsLabel(b)}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted pointer-events-none" />
        </div>
        {radiologistBirads > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 sm:mt-3">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${agreement ? 'bg-benign-500/10 border-benign-500/20' : 'bg-caution-500/10 border-caution-500/20'}`}>
              {agreement ? <CheckCircle2 className="w-4 h-4 text-benign-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-caution-400 flex-shrink-0" />}
              <div>
                <p className={`text-[11px] font-semibold ${agreement ? 'text-benign-400' : 'text-caution-400'}`}>{agreement ? 'Agreement' : 'Discordance'}</p>
                <p className="text-[9px] t-text-tertiary mt-0.5">Rad BI-RADS {radiologistBirads} <ArrowRight className="w-2.5 h-2.5 inline" /> AI BI-RADS {pred.suggestedBIRADS}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Histopathology */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b t-border">
        <h4 className="text-[10px] t-text-muted uppercase tracking-widest font-semibold mb-2 sm:mb-3">Histopathology (Gold Standard)</h4>
        <div className="relative">
          <select value={histoStatus} onChange={e => setHistoStatus(e.target.value)}
            className={`w-full px-3 py-2.5 rounded-lg border text-[12px] appearance-none cursor-pointer focus:outline-none focus:border-clinical-500/30 transition-colors ${selectBg}`}>
            <option value="Not Available">Not Available</option>
            <option value="Pending">Pending Biopsy</option>
            <option value="Benign">Benign</option>
            <option value="Malignant">Malignant</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted pointer-events-none" />
        </div>
        {patient.histopathology?.type && (
          <div className={`mt-2 px-3 py-2 rounded-lg border ${cardBg}`}>
            <p className="text-[10px] t-text-tertiary">Type: <span className="t-text-primary">{patient.histopathology.type}</span></p>
            {patient.histopathology.grade && <p className="text-[10px] t-text-tertiary mt-1">Grade: <span className="t-text-primary">{patient.histopathology.grade}</span></p>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 sm:px-5 py-3 sm:py-4 space-y-2">
        <button onClick={() => setShowReport(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-clinical-500 to-clinical-600 text-white text-[11px] sm:text-[12px] font-semibold hover:from-clinical-400 hover:to-clinical-500 transition-all shadow-lg shadow-clinical-500/20 active:scale-[0.98]">
          <FileText className="w-4 h-4" /> Generate Report
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleSaveCase} className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg border text-[10px] sm:text-[11px] font-medium transition-all active:scale-[0.98] ${isSaved ? 'bg-benign-500/20 text-benign-400 border-benign-500/30' : isDark ? 'bg-dark-700/50 border-white/[0.05] text-dark-200 hover:bg-dark-600/50 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            {isSaved ? <Check className="w-3.5 h-3.5 text-benign-400" /> : <Save className="w-3.5 h-3.5" />}
            {isSaved ? 'Saved!' : 'Save'}
          </button>
          <button onClick={() => downloadSPSSExport()} className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-lg border text-[10px] sm:text-[11px] font-medium transition-all active:scale-[0.98] ${isDark ? 'bg-dark-700/50 border-white/[0.05] text-dark-200 hover:bg-dark-600/50 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8" onClick={() => setShowReport(false)}>
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-8">
              <div className="flex items-start justify-between mb-5 sm:mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Mammo-FM Diagnostic Report</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">AI-Assisted Mammographic Analysis</p>
                </div>
                <button onClick={() => setShowReport(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Patient</h3><p className="text-sm text-gray-900">{patient.patientName}</p><p className="text-xs text-gray-500">{patient.age}y / {patient.sex} — {patient.patientId}</p></div>
                  <div><h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Study</h3><p className="text-sm text-gray-900">{patient.studyDate}</p><p className="text-xs text-gray-500">{patient.institution}</p></div>
                </div>
                <div className={`p-4 rounded-lg border-2 ${isMalignant ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI Prediction</h3>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl sm:text-3xl font-bold ${isMalignant ? 'text-red-600' : 'text-green-600'}`}>{probPercent}%</span>
                    <div>
                      <p className={`text-sm font-semibold ${isMalignant ? 'text-red-700' : 'text-green-700'}`}>{pred.classification} — BI-RADS {pred.suggestedBIRADS}</p>
                      <p className="text-xs text-gray-500">Confidence: {(pred.confidence * 100).toFixed(0)}% | Uncertainty: {(pred.featureUncertainty * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                {radiologistBirads > 0 && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Radiologist</h3>
                    <p className="text-sm text-gray-900">BI-RADS {radiologistBirads} — {getBiradsLabel(radiologistBirads)}</p>
                    <p className="text-xs text-gray-500 mt-1">{agreement ? '✅ Concordant' : '⚠️ Discordant'} with AI</p>
                  </div>
                )}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Histopathology</h3>
                  <p className="text-sm text-gray-900">{histoStatus}</p>
                  {patient.histopathology?.type && <p className="text-xs text-gray-500 mt-1">{patient.histopathology.type} — {patient.histopathology.grade}</p>}
                </div>
                <p className="text-[10px] text-gray-400 italic pt-4 border-t border-gray-200">Disclaimer: AI-assisted report by Mammo-FM v1.0. Not a replacement for clinical judgment.</p>
              </div>
              <div className="flex gap-3 mt-5 sm:mt-6 pt-4 border-t border-gray-200">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Printer className="w-4 h-4" /> Print / PDF</button>
                <button onClick={() => setShowReport(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Close</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
