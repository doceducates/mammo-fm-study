import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Eye, FileText, Download, Trash2, Filter, ArrowUpDown, ChevronDown, ChevronUp,
  AlertTriangle, Shield, User as UserIcon, X, Check,
  FileSpreadsheet, Lock, Unlock, Camera, Sparkles, ChevronRight as ChevronRightIcon,
  Ruler, MoreHorizontal,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { useEffect } from 'react';
import { patientList } from '../mockData';
import { fetchPatients, downloadSPSSExport, savePatientCase } from '../api';
import type { PatientCase, ExtendedResearchData } from '../types';

interface PatientListProps {
  onSelectPatient: (patient: PatientCase) => void;
}

type SortField = 'name' | 'age' | 'date' | 'probability' | 'status' | 'density' | 'lesionSize';
type SortDir = 'asc' | 'desc';
type DrawerTab = 'thesis' | 'extended' | 'ocr';

const PAGE_SIZES = [8, 12, 20] as const;
const BIRADS_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
const DENSITY_OPTIONS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
const HISTO_OPTIONS = ['Not Available', 'Pending', 'Benign', 'Malignant'] as const;
const MARGIN_OPTIONS = ['Circumscribed', 'Obscured', 'Microlobulated', 'Indistinct', 'Spiculated'] as const;
const VASCULARITY_OPTIONS = ['Absent', 'Internal', 'Peripheral', 'Both'] as const;
const TUMOR_SUBTYPES = ['Invasive Ductal Carcinoma', 'Invasive Lobular Carcinoma', 'DCIS', 'Mucinous Carcinoma', 'Papillary Carcinoma', 'Tubular Carcinoma', 'Other'];

export default function PatientList({ onSelectPatient }: PatientListProps) {
  const { isDark } = useTheme();
  const [patients, setPatients] = useState<PatientCase[]>(patientList);

  useEffect(() => {
    fetchPatients().then(data => {
      if (data && data.length > 0) {
        setPatients(data);
      }
    });
  }, []);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(8);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anonymized, setAnonymized] = useState(false);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState<PatientCase | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('thesis');
  const [editForm, setEditForm] = useState<Partial<PatientCase & { extendedData: ExtendedResearchData }>>({});
  
  // Inline edit state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'birads' | 'histo' | null>(null);
  
  // OCR state
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let list = [...patients];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.patientName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter(p => p.status === filterStatus);
    }
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortField) {
        case 'name': av = a.patientName; bv = b.patientName; break;
        case 'age': av = a.age; bv = b.age; break;
        case 'date': av = a.studyDate; bv = b.studyDate; break;
        case 'probability': av = a.aiPrediction.malignancyProbability; bv = b.aiPrediction.malignancyProbability; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'density': av = a.density || 'Z'; bv = b.density || 'Z'; break;
        case 'lesionSize': av = a.lesionSize || 0; bv = b.lesionSize || 0; break;
        default: av = a.id; bv = b.id;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [patients, search, filterStatus, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
    setPage(1);
  };

  const SortBtn = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
    <button onClick={() => toggleSort(field)} className={`flex items-center gap-1 text-left select-none group ${className}`}>
      <span>{label}</span>
      {sortField === field
        ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-clinical-400" /> : <ChevronDown className="w-3 h-3 text-clinical-400" />
        : <ArrowUpDown className="w-3 h-3 t-text-muted group-hover:t-text-tertiary transition-colors" />}
    </button>
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'bg-benign-500/15 text-benign-400 border-benign-500/20';
      case 'reviewed': return 'bg-clinical-500/15 text-clinical-400 border-clinical-500/20';
      case 'analyzing': return 'bg-caution-500/15 text-caution-400 border-caution-500/20';
      case 'pending': return isDark ? 'bg-dark-600 text-dark-300 border-dark-500' : 'bg-gray-100 text-gray-500 border-gray-200';
      default: return '';
    }
  };

  const densityColor = (d?: string) => {
    switch (d) {
      case 'A': return 'bg-benign-500/15 text-benign-400 border-benign-500/20';
      case 'B': return 'bg-clinical-500/15 text-clinical-400 border-clinical-500/20';
      case 'C': return 'bg-caution-500/15 text-caution-400 border-caution-500/20';
      case 'D': return 'bg-malignant-500/15 text-malignant-400 border-malignant-500/20';
      default: return isDark ? 'bg-dark-600 text-dark-400 border-dark-500' : 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(p => p.id)));
    }
  };

  // Export SPSS (coded CSV)
  const exportSPSS = async () => {
    await downloadSPSSExport();
  };

  // Inline edit handlers
  const handleInlineEdit = (patientId: string, field: 'birads' | 'histo', value: number | string) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      if (field === 'birads') {
        return {
          ...p,
          radiologistAssessment: {
            ...p.radiologistAssessment,
            birads: value as number,
            notes: p.radiologistAssessment?.notes || '',
            assessedBy: p.radiologistAssessment?.assessedBy || 'Dr. Khan',
            assessedAt: new Date().toISOString(),
          },
        };
      } else {
        return {
          ...p,
          histopathology: {
            ...p.histopathology,
            status: value as 'Malignant' | 'Benign' | 'Pending' | 'Not Available',
          },
        };
      }
    }));
    setInlineEditId(null);
    setInlineEditField(null);
  };

  // Drawer handlers
  const openDrawer = (patient: PatientCase) => {
    setDrawerPatient(patient);
    setEditForm({
      age: patient.age,
      density: patient.density,
      lesionSize: patient.lesionSize,
      tumorSubtype: patient.tumorSubtype,
      radiologistAssessment: patient.radiologistAssessment,
      histopathology: patient.histopathology,
      extendedData: patient.extendedData || {},
    });
    setDrawerTab('thesis');
    setDrawerOpen(true);
    setOcrText('');
    setOcrFile(null);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerPatient(null);
    setEditForm({});
  };

  const saveDrawerForm = () => {
    if (!drawerPatient) return;
    setPatients(prev => prev.map(p => {
      if (p.id !== drawerPatient.id) return p;
      return {
        ...p,
        age: editForm.age ?? p.age,
        density: editForm.density ?? p.density,
        lesionSize: editForm.lesionSize ?? p.lesionSize,
        tumorSubtype: editForm.tumorSubtype ?? p.tumorSubtype,
        radiologistAssessment: editForm.radiologistAssessment ?? p.radiologistAssessment,
        histopathology: editForm.histopathology ?? p.histopathology,
        extendedData: editForm.extendedData ?? p.extendedData,
      };
    }));
    closeDrawer();
  };

  // OCR simulation
  const handleOCRUpload = (file: File) => {
    setOcrFile(file);
    // Simulate OCR extraction
    setTimeout(() => {
      setOcrText(`RADIOLOGY REPORT
Patient: ${drawerPatient?.patientName || 'Unknown'}
Date: ${new Date().toLocaleDateString()}

FINDINGS:
Breast density: Category C (heterogeneously dense)
Right breast: Irregular mass at 2 o'clock position
Size: 24mm x 18mm
BI-RADS Category: 4C - High suspicion for malignancy

PATHOLOGY RESULTS:
Specimen: Core needle biopsy
Diagnosis: Invasive ductal carcinoma, Grade II
ER/PR: Positive
HER2: Negative

Lymph node cortical thickness: 4.2mm
Margins: Spiculated
No satellite lesions identified.`);
      // Auto-fill form
      setEditForm(prev => ({
        ...prev,
        density: 'C',
        lesionSize: 24,
        radiologistAssessment: {
          ...prev.radiologistAssessment,
          birads: 4,
          notes: 'High suspicion for malignancy',
          assessedBy: prev.radiologistAssessment?.assessedBy || 'Dr. Khan',
          assessedAt: new Date().toISOString(),
        },
        histopathology: {
          status: 'Malignant' as const,
          type: 'Invasive Ductal Carcinoma',
          grade: 'Grade II',
        },
        tumorSubtype: 'Invasive Ductal Carcinoma',
        extendedData: {
          ...prev.extendedData,
          axillaryLymphNodeThickness: 4.2,
          margins: 'Spiculated',
          satelliteLesions: false,
        },
      }));
    }, 1500);
  };

  const getDisplayName = (p: PatientCase) => {
    if (anonymized) {
      const globalIndex = filtered.findIndex(f => f.id === p.id);
      return `STUDY-${String(globalIndex + 1).padStart(3, '0')}`;
    }
    return p.patientName;
  };

  const inputBg = isDark ? 'bg-dark-800/50 border-white/[0.06] text-dark-100' : 'bg-white border-gray-200 text-gray-800';

  return (
    <div className="flex flex-col h-full">
      {/* Header + Search */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold t-text-primary flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-clinical-400" />
              Patient Cases
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-clinical-500/15 text-clinical-400 border border-clinical-500/20">
                {filtered.length}
              </span>
              {selectedIds.size > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-accent-500/15 text-accent-400 border border-accent-500/20">
                  {selectedIds.size} selected
                </span>
              )}
            </h2>
            <p className="text-[11px] sm:text-[12px] t-text-tertiary mt-0.5">Manage and review mammography studies</p>
          </div>
        </div>

        {/* Search + Export Controls */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted" />
              <input
                type="text"
                placeholder="Search patient name, case ID..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl t-input border text-[12px] sm:text-[13px] placeholder:t-text-muted focus:outline-none focus:border-clinical-500/40 transition-colors"
              />
            </div>
            
            {/* Export SPSS Button */}
            <button
              onClick={exportSPSS}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-[11px] sm:text-[12px] font-semibold hover:from-accent-400 hover:to-accent-500 transition-all shadow-md shadow-accent-500/20 active:scale-[0.98] flex-shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export SPSS</span>
              <span className="sm:hidden">SPSS</span>
            </button>
            
            {/* Anonymize Toggle */}
            <button
              onClick={() => setAnonymized(!anonymized)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-[12px] font-semibold transition-all border flex-shrink-0 ${
                anonymized
                  ? 'bg-caution-500/15 text-caution-400 border-caution-500/20'
                  : isDark ? 'bg-dark-700/50 border-white/[0.05] text-dark-200 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              {anonymized ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              <span className="hidden sm:inline">{anonymized ? 'Anonymized' : 'Anonymize'}</span>
            </button>
          </div>
          
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'pending', 'analyzing', 'completed', 'reviewed'].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all border ${
                  filterStatus === s
                    ? 'bg-clinical-500/10 text-clinical-400 border-clinical-500/20'
                    : 't-text-tertiary border-transparent hover:t-text-secondary'
                }`}
              >
                <Filter className="w-3 h-3 inline mr-0.5 sm:mr-1" />
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE (desktop) / CARDS (mobile) */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-2">
        {/* Desktop Table */}
        <div className="hidden lg:block rounded-xl glass-panel overflow-hidden">
          <table className="w-full">
            <thead className="t-thead sticky top-0 z-10 backdrop-blur-sm">
              <tr className="border-b t-border-strong">
                {/* Checkbox */}
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-2 t-border accent-clinical-500"
                  />
                </th>
                <th className="px-3 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="name" label="Patient" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="age" label="Age" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="date" label="Date" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="probability" label="AI Risk" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider">BI-RADS</th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="density" label="Density" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="lesionSize" label="Size" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider">Histo</th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider"><SortBtn field="status" label="Status" /></th>
                <th className="px-2 py-3 text-[9px] font-semibold t-text-tertiary uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, i) => {
                const prob = p.aiPrediction.malignancyProbability;
                const isMal = p.aiPrediction.classification === 'Malignant';
                const birads = p.radiologistAssessment?.birads ?? p.aiPrediction.suggestedBIRADS;
                const isSelected = selectedIds.has(p.id);
                
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b t-border t-tr-hover transition-colors group cursor-pointer ${isSelected ? (isDark ? 'bg-clinical-500/5' : 'bg-clinical-50') : ''}`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button, input, select')) return;
                      openDrawer(p);
                    }}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded border-2 t-border accent-clinical-500"
                      />
                    </td>
                    {/* Patient */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                          isMal ? 'bg-malignant-500/10 text-malignant-400' : 'bg-benign-500/10 text-benign-400'
                        }`}>
                          {p.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold t-text-primary truncate max-w-[120px]">{getDisplayName(p)}</p>
                          <p className="text-[9px] font-mono t-text-tertiary">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    {/* Age */}
                    <td className="px-2 py-2.5 text-[11px] t-text-secondary">{p.age}y</td>
                    {/* Date */}
                    <td className="px-2 py-2.5 text-[10px] font-mono t-text-secondary">{p.studyDate}</td>
                    {/* AI Risk */}
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#1a1d2e' : '#e5e7eb' }}>
                          <div className="h-full rounded-full" style={{ width: `${prob * 100}%`, backgroundColor: prob > 0.7 ? '#ef4444' : prob > 0.4 ? '#f59e0b' : '#10b981' }} />
                        </div>
                        <span className={`text-[10px] font-mono font-semibold ${isMal ? 'text-malignant-400' : 'text-benign-400'}`}>{(prob * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    {/* BI-RADS - Inline Editable */}
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      {inlineEditId === p.id && inlineEditField === 'birads' ? (
                        <select
                          autoFocus
                          value={birads}
                          onChange={e => handleInlineEdit(p.id, 'birads', Number(e.target.value))}
                          onBlur={() => { setInlineEditId(null); setInlineEditField(null); }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${inputBg} border focus:outline-none focus:border-clinical-500/40`}
                        >
                          {BIRADS_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => { setInlineEditId(p.id); setInlineEditField('birads'); }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all hover:ring-2 hover:ring-clinical-500/30 ${
                            birads >= 4 ? 'bg-malignant-500/15 text-malignant-400' : 'bg-benign-500/15 text-benign-400'
                          }`}
                          title="Click to edit"
                        >
                          {birads}
                        </button>
                      )}
                    </td>
                    {/* Density */}
                    <td className="px-2 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${densityColor(p.density)}`}>
                        {p.density || '—'}
                      </span>
                    </td>
                    {/* Lesion Size */}
                    <td className="px-2 py-2.5">
                      {p.lesionSize ? (
                        <span className="text-[10px] font-mono t-text-secondary flex items-center gap-0.5">
                          <Ruler className="w-3 h-3 t-text-muted" />
                          {p.lesionSize}mm
                        </span>
                      ) : (
                        <span className="text-[10px] t-text-muted">—</span>
                      )}
                    </td>
                    {/* Histopathology - Inline Editable */}
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      {inlineEditId === p.id && inlineEditField === 'histo' ? (
                        <select
                          autoFocus
                          value={p.histopathology?.status || 'Not Available'}
                          onChange={e => handleInlineEdit(p.id, 'histo', e.target.value)}
                          onBlur={() => { setInlineEditId(null); setInlineEditField(null); }}
                          className={`text-[10px] font-semibold px-1 py-0.5 rounded ${inputBg} border focus:outline-none focus:border-clinical-500/40`}
                        >
                          {HISTO_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => { setInlineEditId(p.id); setInlineEditField('histo'); }}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-all hover:ring-2 hover:ring-clinical-500/30 ${
                            p.histopathology?.status === 'Malignant' ? 'bg-malignant-500/15 text-malignant-400' :
                            p.histopathology?.status === 'Benign' ? 'bg-benign-500/15 text-benign-400' :
                            isDark ? 'bg-dark-600 text-dark-400' : 'bg-gray-100 text-gray-400'
                          }`}
                          title="Click to edit"
                        >
                          {p.histopathology?.status?.slice(0, 3) || 'N/A'}
                        </button>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-2 py-2.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${statusColor(p.status)} capitalize`}>{p.status.slice(0, 4)}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => onSelectPatient(p)} className="p-1.5 rounded-lg text-clinical-400 hover:bg-clinical-500/10 transition-all" title="View & Analyze">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openDrawer(p)} className="p-1.5 rounded-lg t-text-tertiary hover:text-accent-400 hover:bg-accent-500/10 transition-all" title="Edit Form">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg t-text-tertiary hover:text-benign-400 hover:bg-benign-500/10 transition-all" title="Export">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg t-text-muted hover:text-malignant-400 hover:bg-malignant-500/10 transition-all opacity-0 group-hover:opacity-100" title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-2.5">
          {paginated.map((p, i) => {
            const prob = p.aiPrediction.malignancyProbability;
            const isMal = p.aiPrediction.classification === 'Malignant';
            const birads = p.radiologistAssessment?.birads ?? p.aiPrediction.suggestedBIRADS;
            const isSelected = selectedIds.has(p.id);
            
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-panel rounded-xl p-4 space-y-3 cursor-pointer ${isSelected ? (isDark ? 'ring-1 ring-clinical-500/30' : 'ring-1 ring-clinical-500/40') : ''}`}
                onClick={() => openDrawer(p)}
              >
                {/* Top row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-2 t-border accent-clinical-500"
                    />
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                      isMal ? 'bg-malignant-500/10 text-malignant-400' : 'bg-benign-500/10 text-benign-400'
                    }`}>
                      {p.patientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold t-text-primary">{getDisplayName(p)}</p>
                      <p className="text-[10px] font-mono t-text-tertiary">{p.id} · {p.age}y</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${statusColor(p.status)} capitalize`}>{p.status}</span>
                </div>

                {/* Metrics row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {isMal ? <AlertTriangle className="w-3 h-3 text-malignant-400" /> : <Shield className="w-3 h-3 text-benign-400" />}
                    <span className={`text-[12px] font-mono font-bold ${isMal ? 'text-malignant-400' : 'text-benign-400'}`}>{(prob * 100).toFixed(0)}%</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${birads >= 4 ? 'bg-malignant-500/15 text-malignant-400' : 'bg-benign-500/15 text-benign-400'}`}>BI-RADS {birads}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${densityColor(p.density)}`}>{p.density || '—'}</span>
                  {p.lesionSize && <span className="text-[10px] font-mono t-text-tertiary">{p.lesionSize}mm</span>}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1 border-t t-border" onClick={e => e.stopPropagation()}>
                  <button onClick={() => onSelectPatient(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-clinical-500/10 text-clinical-400 text-[11px] font-semibold hover:bg-clinical-500/20 transition-all">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <button onClick={() => openDrawer(p)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg t-bg-el text-accent-400 text-[11px] font-semibold hover:bg-accent-500/10 transition-all border t-border">
                    <FileText className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="p-2 rounded-lg t-bg-el t-text-tertiary hover:text-benign-400 transition-all border t-border">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 t-text-muted mx-auto mb-3" />
            <p className="text-[14px] font-semibold t-text-secondary">No patients found</p>
            <p className="text-[12px] t-text-tertiary mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="px-4 sm:px-6 py-3 border-t t-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] t-text-tertiary">
            <span>Show</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 rounded-lg t-input border text-[11px] focus:outline-none">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>of {filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 hover:t-text-primary t-bg-hover transition-all"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 hover:t-text-primary t-bg-hover transition-all"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${page === pageNum ? 'bg-clinical-500 text-white shadow-md shadow-clinical-500/20' : 't-text-secondary t-bg-hover'}`}>{pageNum}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 hover:t-text-primary t-bg-hover transition-all"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 hover:t-text-primary t-bg-hover transition-all"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SLIDE-OVER EDIT DRAWER
          ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {drawerOpen && drawerPatient && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={closeDrawer}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 glass-panel border-l t-border overflow-hidden flex flex-col ${isDark ? '' : 'bg-white'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b t-border">
                <div>
                  <h3 className="text-[14px] font-bold t-text-primary">{anonymized ? `STUDY-${String(filtered.findIndex(f => f.id === drawerPatient.id) + 1).padStart(3, '0')}` : drawerPatient.patientName}</h3>
                  <p className="text-[11px] font-mono t-text-tertiary">{drawerPatient.id} · {drawerPatient.age}y</p>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg t-bg-hover t-text-tertiary hover:t-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b t-border px-5">
                {([
                  { id: 'thesis', label: 'Thesis Core Form', icon: FileText },
                  { id: 'extended', label: 'Extended Data', icon: MoreHorizontal },
                  { id: 'ocr', label: 'OCR Auto-Fill', icon: Camera },
                ] as const).map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-semibold border-b-2 transition-all ${
                        drawerTab === tab.id
                          ? 'border-clinical-500 text-clinical-400'
                          : 'border-transparent t-text-tertiary hover:t-text-secondary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.id === 'thesis' ? 'Core' : tab.id === 'extended' ? 'Ext' : 'OCR'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* ─── TAB A: Thesis Core Form ─── */}
                {drawerTab === 'thesis' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Age */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Age</label>
                        <input
                          type="number"
                          value={editForm.age || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, age: Number(e.target.value) }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        />
                      </div>
                      {/* BI-RADS */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">BI-RADS (0-5)</label>
                        <select
                          value={editForm.radiologistAssessment?.birads ?? 0}
                          onChange={e => setEditForm(prev => ({
                            ...prev,
                            radiologistAssessment: { ...prev.radiologistAssessment, birads: Number(e.target.value), notes: prev.radiologistAssessment?.notes || '', assessedBy: prev.radiologistAssessment?.assessedBy || 'Dr. Khan', assessedAt: new Date().toISOString() }
                          }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        >
                          {BIRADS_OPTIONS.map(b => <option key={b} value={b}>BI-RADS {b}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Density */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Breast Density (A-D)</label>
                        <select
                          value={editForm.density || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, density: e.target.value as 'A' | 'B' | 'C' | 'D' }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        >
                          <option value="">Select...</option>
                          {DENSITY_OPTIONS.map(d => <option key={d} value={d}>Category {d}</option>)}
                        </select>
                      </div>
                      {/* Lesion Size */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Lesion Size (mm)</label>
                        <input
                          type="number"
                          placeholder="e.g., 24"
                          value={editForm.lesionSize || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, lesionSize: Number(e.target.value) || undefined }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Histopathology */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Histopathology</label>
                        <select
                          value={editForm.histopathology?.status || 'Not Available'}
                          onChange={e => setEditForm(prev => ({
                            ...prev,
                            histopathology: { ...prev.histopathology, status: e.target.value as 'Malignant' | 'Benign' | 'Pending' | 'Not Available' }
                          }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        >
                          {HISTO_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      {/* Tumor Subtype */}
                      <div>
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Tumor Subtype</label>
                        <select
                          value={editForm.tumorSubtype || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, tumorSubtype: e.target.value }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        >
                          <option value="">Select...</option>
                          {TUMOR_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* ─── TAB B: Extended Research Data ─── */}
                {drawerTab === 'extended' && (
                  <>
                    <details className="group" open>
                      <summary className="flex items-center justify-between cursor-pointer py-2 border-b t-border">
                        <span className="text-[12px] font-semibold t-text-primary">Ultrasound Findings</span>
                        <ChevronRightIcon className="w-4 h-4 t-text-tertiary group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="pt-3 pb-2">
                        <textarea
                          placeholder="Describe correlative ultrasound findings..."
                          value={editForm.extendedData?.ultrasoundFindings || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, extendedData: { ...prev.extendedData, ultrasoundFindings: e.target.value } }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[12px] ${inputBg} focus:outline-none focus:border-clinical-500/40 resize-none h-20`}
                        />
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-2 border-b t-border">
                        <span className="text-[12px] font-semibold t-text-primary">Axillary Lymph Node</span>
                        <ChevronRightIcon className="w-4 h-4 t-text-tertiary group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="pt-3 pb-2">
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Cortical Thickness (mm)</label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="e.g., 3.5"
                          value={editForm.extendedData?.axillaryLymphNodeThickness || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, extendedData: { ...prev.extendedData, axillaryLymphNodeThickness: Number(e.target.value) || undefined } }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        />
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-2 border-b t-border">
                        <span className="text-[12px] font-semibold t-text-primary">Mass Characteristics</span>
                        <ChevronRightIcon className="w-4 h-4 t-text-tertiary group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="pt-3 pb-2 space-y-3">
                        <div>
                          <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Margins</label>
                          <select
                            value={editForm.extendedData?.margins || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, extendedData: { ...prev.extendedData, margins: e.target.value as any } }))}
                            className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                          >
                            <option value="">Select...</option>
                            {MARGIN_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.extendedData?.satelliteLesions || false}
                              onChange={e => setEditForm(prev => ({ ...prev, extendedData: { ...prev.extendedData, satelliteLesions: e.target.checked } }))}
                              className="w-4 h-4 rounded border-2 t-border accent-clinical-500"
                            />
                            <span className="text-[12px] t-text-secondary">Satellite Lesions Present</span>
                          </label>
                        </div>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-2 border-b t-border">
                        <span className="text-[12px] font-semibold t-text-primary">Doppler Assessment</span>
                        <ChevronRightIcon className="w-4 h-4 t-text-tertiary group-open:rotate-90 transition-transform" />
                      </summary>
                      <div className="pt-3 pb-2">
                        <label className="text-[10px] font-semibold t-text-tertiary uppercase tracking-wider mb-1 block">Vascularity Pattern</label>
                        <select
                          value={editForm.extendedData?.dopplerVascularity || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, extendedData: { ...prev.extendedData, dopplerVascularity: e.target.value as any } }))}
                          className={`w-full px-3 py-2 rounded-lg border text-[13px] ${inputBg} focus:outline-none focus:border-clinical-500/40`}
                        >
                          <option value="">Select...</option>
                          {VASCULARITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                    </details>
                  </>
                )}

                {/* ─── TAB C: OCR Paper Report Auto-Fill ─── */}
                {drawerTab === 'ocr' && (
                  <>
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                        ocrFile ? 'border-benign-500/40 bg-benign-500/5' : isDark ? 'border-dark-500 hover:border-dark-400' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleOCRUpload(e.dataTransfer.files[0]); }}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleOCRUpload(e.target.files[0]); }}
                      />
                      {ocrFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="w-5 h-5 text-benign-400" />
                          <span className="text-[12px] font-semibold text-benign-400">{ocrFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 t-text-muted mx-auto mb-2" />
                          <p className="text-[12px] font-semibold t-text-secondary">Upload Paper Report Photo</p>
                          <p className="text-[10px] t-text-tertiary mt-1">Drag & drop or click to browse</p>
                        </>
                      )}
                    </div>

                    {ocrText && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-accent-400" />
                          <span className="text-[11px] font-semibold text-accent-400">OCR Extracted Text</span>
                        </div>
                        <div className={`rounded-lg p-3 text-[11px] font-mono leading-relaxed max-h-48 overflow-y-auto ${isDark ? 'bg-dark-800/50' : 'bg-gray-50'} t-text-secondary whitespace-pre-wrap`}>
                          {ocrText}
                        </div>
                        <div className={`mt-3 p-3 rounded-lg border ${isDark ? 'bg-benign-500/10 border-benign-500/20' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-benign-400" />
                            <span className="text-[11px] font-semibold text-benign-400">Form fields auto-filled from OCR</span>
                          </div>
                          <p className="text-[10px] t-text-tertiary mt-1">Review the Thesis Core Form tab to verify extracted data.</p>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 px-5 py-4 border-t t-border">
                <button onClick={closeDrawer} className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${isDark ? 'bg-dark-700/50 text-dark-200 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>
                  Cancel
                </button>
                <button onClick={saveDrawerForm} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-clinical-500 to-clinical-600 text-white text-[12px] font-semibold hover:from-clinical-400 hover:to-clinical-500 transition-all shadow-md shadow-clinical-500/20">
                  <Check className="w-4 h-4 inline mr-1" /> Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
