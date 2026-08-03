import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Search, Download, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FolderOpen, Upload, Database, TrendingUp, Users,
  Target, Percent, ArrowUpDown, FileSpreadsheet, Eye, FileText,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { cohortCases, cohortStats } from '../mockData';

type SortField = 'id' | 'age' | 'probability' | 'birads' | 'histopathology';
type SortDirection = 'asc' | 'desc';

export default function ResearchCohort() {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<'all' | 'Malignant' | 'Benign'>('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isUploaded, setIsUploaded] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredCases = useMemo(() => {
    let cases = [...cohortCases];
    if (searchQuery) {
      cases = cases.filter(c => c.id.toLowerCase().includes(searchQuery.toLowerCase()) || c.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterClass !== 'all') cases = cases.filter(c => c.aiPrediction.classification === filterClass);
    cases.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      switch (sortField) {
        case 'id': aVal = a.id; bVal = b.id; break;
        case 'age': aVal = a.age; bVal = b.age; break;
        case 'probability': aVal = a.aiPrediction.malignancyProbability; bVal = b.aiPrediction.malignancyProbability; break;
        case 'birads': aVal = a.aiPrediction.suggestedBIRADS; bVal = b.aiPrediction.suggestedBIRADS; break;
        case 'histopathology': aVal = a.histopathology?.status || ''; bVal = b.histopathology?.status || ''; break;
        default: aVal = a.id; bVal = b.id;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return cases;
  }, [searchQuery, filterClass, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredCases.length / pageSize);
  const paginated = filteredCases.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 t-text-muted" />;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3 text-clinical-400" /> : <ChevronDown className="w-3 h-3 text-clinical-400" />;
  };

  const pieData = [
    { name: 'Malignant', value: cohortStats.malignantCount, color: '#ef4444' },
    { name: 'Benign', value: cohortStats.benignCount, color: '#10b981' },
  ];

  const tooltipStyle = {
    backgroundColor: isDark ? '#12141e' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '8px', fontSize: '11px', color: isDark ? '#b0b5d0' : '#374151',
  };
  const axisColor = isDark ? '#5a5f85' : '#9ca3af';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  const exportCSV = () => {
    const headers = ['Case ID','Patient ID','Age','Sex','AI Probability','AI Classification','AI BI-RADS','Confidence','Radiologist BI-RADS','Histopathology'];
    const rows = filteredCases.map(c => [c.id,c.patientId,c.age,c.sex,c.aiPrediction.malignancyProbability.toFixed(3),c.aiPrediction.classification,c.aiPrediction.suggestedBIRADS,c.aiPrediction.confidence,c.radiologistAssessment?.birads||'',c.histopathology?.status||''].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mammo-fm-cohort.csv'; a.click(); URL.revokeObjectURL(url);
  };

  if (!isUploaded) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-accent-500/10">
            <FolderOpen className="w-7 h-7 sm:w-9 sm:h-9 text-accent-400" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold t-text-primary mb-2">Load Research Cohort</h2>
          <p className="text-[12px] sm:text-sm t-text-tertiary mb-6 sm:mb-8">Upload a batch of mammogram studies for cohort-level analysis.</p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <button onClick={() => setIsUploaded(true)} className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold">
              <Upload className="w-4 h-4 inline mr-2" /> Upload Directory
            </button>
            <button onClick={() => setIsUploaded(true)} className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl t-card text-sm font-semibold t-text-secondary">Load LGH Demo (72 cases)</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header + Stats */}
      <div className="p-3 sm:p-4 pb-0 overflow-y-auto flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <div>
            <h2 className="text-[14px] sm:text-[15px] font-bold t-text-primary flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-400" /> LGH Research Cohort
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-accent-500/15 text-accent-400 border border-accent-500/20">{cohortStats.totalCases} cases</span>
            </h2>
            <p className="text-[10px] sm:text-[11px] t-text-tertiary mt-1">Lahore General Hospital — Institutional Dataset Validation</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-[10px] sm:text-[11px] font-medium transition-all ${isDark ? 'bg-dark-700/50 border-white/[0.05] text-dark-200 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'}`}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={exportCSV} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-[10px] sm:text-[11px] font-medium transition-all ${isDark ? 'bg-dark-700/50 border-white/[0.05] text-dark-200 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'}`}>
              <Download className="w-3.5 h-3.5" /> SPSS
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-3 sm:mb-4">
          {[
            { label: 'Total', value: cohortStats.totalCases, icon: Users, color: 'text-clinical-400' },
            { label: 'Malignant', value: cohortStats.malignantCount, icon: Target, color: 'text-malignant-400' },
            { label: 'Benign', value: cohortStats.benignCount, icon: Target, color: 'text-benign-400' },
            { label: 'Mean Prob', value: `${(cohortStats.meanProbability * 100).toFixed(1)}%`, icon: Percent, color: 'text-caution-400' },
            { label: 'Std Dev', value: `±${(cohortStats.stdDeviation * 100).toFixed(1)}%`, icon: TrendingUp, color: 'text-accent-400' },
            { label: 'AUC', value: cohortStats.auc.toFixed(3), icon: TrendingUp, color: 'text-teal-400' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-panel-light rounded-xl px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex items-center gap-1.5 mb-0.5 sm:mb-1">
                  <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${s.color}`} />
                  <span className="text-[8px] sm:text-[9px] t-text-muted uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <p className="text-[15px] sm:text-[18px] font-bold t-text-primary">{s.value}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3 sm:mb-4">
          <div className="lg:col-span-2 glass-panel-light rounded-xl p-3 sm:p-4">
            <h3 className="text-[10px] sm:text-[11px] font-semibold t-text-secondary uppercase tracking-wider mb-2 sm:mb-3">Probability Distribution</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cohortStats.distributions} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="range" tick={{ fontSize: 8, fill: axisColor }} axisLine={{ stroke: gridColor }} />
                <YAxis tick={{ fontSize: 8, fill: axisColor }} axisLine={{ stroke: gridColor }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="benign" fill="#10b981" radius={[3,3,0,0]} name="Benign" />
                <Bar dataKey="malignant" fill="#ef4444" radius={[3,3,0,0]} name="Malignant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-panel-light rounded-xl p-3 sm:p-4">
            <h3 className="text-[10px] sm:text-[11px] font-semibold t-text-secondary uppercase tracking-wider mb-2 sm:mb-3">Classification Split</h3>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart><Pie data={pieData} innerRadius={30} outerRadius={48} paddingAngle={4} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-3 sm:gap-4 mt-2">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-malignant-500" /><span className="text-[9px] sm:text-[10px] t-text-tertiary">Malignant ({cohortStats.malignantCount})</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-benign-500" /><span className="text-[9px] sm:text-[10px] t-text-tertiary">Benign ({cohortStats.benignCount})</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="px-3 sm:px-4 pb-2 flex flex-col sm:flex-row gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted" />
          <input type="text" placeholder="Search Case ID..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl t-input border text-[12px] placeholder:t-text-muted focus:outline-none focus:border-clinical-500/30 transition-colors" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {(['all', 'Malignant', 'Benign'] as const).map(f => (
            <button key={f} onClick={() => { setFilterClass(f); setPage(1); }}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all border ${
                filterClass === f
                  ? f === 'Malignant' ? 'bg-malignant-500/15 text-malignant-400 border-malignant-500/20'
                  : f === 'Benign' ? 'bg-benign-500/15 text-benign-400 border-benign-500/20'
                  : 'bg-clinical-500/10 text-clinical-400 border-clinical-500/20'
                  : 't-text-muted border-transparent'
              }`}>
              <Filter className="w-3 h-3 inline mr-0.5" />{f === 'all' ? 'All' : f}
            </button>
          ))}
          <span className="text-[10px] sm:text-[11px] t-text-muted font-mono ml-1">{filteredCases.length}</span>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="flex-1 overflow-auto px-3 sm:px-4 pb-1 min-h-0">
        {/* Desktop */}
        <div className="hidden md:block rounded-xl glass-panel-light overflow-hidden">
          <table className="w-full">
            <thead className="t-thead sticky top-0 z-10 backdrop-blur-sm">
              <tr className="border-b t-border-strong">
                {[
                  { field: 'id' as SortField, label: 'Case ID' },
                  { field: 'age' as SortField, label: 'Age' },
                  { field: 'probability' as SortField, label: 'AI Prob' },
                  { field: 'birads' as SortField, label: 'BI-RADS' },
                  { field: 'id' as SortField, label: 'Conf.' },
                  { field: 'id' as SortField, label: 'Rad' },
                  { field: 'histopathology' as SortField, label: 'Histo' },
                  { field: 'id' as SortField, label: 'Agree' },
                  { field: 'id' as SortField, label: 'Actions' },
                ].map((col, i) => (
                  <th key={i} onClick={() => handleSort(col.field)} className="px-3 py-2.5 text-left text-[9px] font-semibold t-text-muted uppercase tracking-wider cursor-pointer select-none">
                    <div className="flex items-center gap-1">{col.label}<SortIcon field={col.field} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => {
                const prob = c.aiPrediction.malignancyProbability;
                const isMal = c.aiPrediction.classification === 'Malignant';
                const radBirads = c.radiologistAssessment?.birads || 0;
                const agree = radBirads > 0 && ((radBirads >= 4 && c.aiPrediction.suggestedBIRADS >= 4) || (radBirads < 4 && c.aiPrediction.suggestedBIRADS < 4));
                return (
                  <tr key={c.id} className="border-b t-border t-tr-hover transition-colors group">
                    <td className="px-3 py-2 text-[11px] font-mono font-medium t-text-primary">{c.id}</td>
                    <td className="px-3 py-2 text-[11px] t-text-secondary">{c.age}y</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#1a1d2e' : '#e5e7eb' }}>
                          <div className="h-full rounded-full" style={{ width: `${prob*100}%`, backgroundColor: prob>0.7?'#ef4444':prob>0.4?'#f59e0b':'#10b981' }} />
                        </div>
                        <span className={`text-[10px] font-mono font-semibold ${isMal?'text-malignant-400':'text-benign-400'}`}>{(prob*100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.aiPrediction.suggestedBIRADS>=4?'bg-malignant-500/15 text-malignant-400':'bg-benign-500/15 text-benign-400'}`}>{c.aiPrediction.suggestedBIRADS}</span></td>
                    <td className="px-3 py-2 text-[10px] font-mono t-text-secondary">{(c.aiPrediction.confidence*100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-[10px] font-mono t-text-secondary">{radBirads||'—'}</td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.histopathology?.status==='Malignant'?'bg-malignant-500/15 text-malignant-400':c.histopathology?.status==='Benign'?'bg-benign-500/15 text-benign-400':isDark?'bg-dark-600 text-dark-400':'bg-gray-100 text-gray-400'}`}>{c.histopathology?.status||'N/A'}</span></td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-semibold ${radBirads>0?(agree?'text-benign-400':'text-caution-400'):'t-text-muted'}`}>{radBirads>0?(agree?'✓':'✗'):'—'}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        <button className="p-1 rounded text-clinical-400 hover:bg-clinical-500/10 transition-all" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1 rounded t-text-tertiary hover:text-accent-400 hover:bg-accent-500/10 transition-all" title="Report"><FileText className="w-3.5 h-3.5" /></button>
                        <button className="p-1 rounded t-text-tertiary hover:text-benign-400 hover:bg-benign-500/10 transition-all" title="Export"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {paginated.map(c => {
            const prob = c.aiPrediction.malignancyProbability;
            const isMal = c.aiPrediction.classification === 'Malignant';
            return (
              <div key={c.id} className="glass-panel rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-mono font-semibold t-text-primary">{c.id}</p>
                    <p className="text-[10px] t-text-tertiary">{c.age}y · {c.studyDate}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${c.histopathology?.status==='Malignant'?'bg-malignant-500/15 text-malignant-400':'bg-benign-500/15 text-benign-400'}`}>{c.histopathology?.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[12px] font-mono font-bold ${isMal?'text-malignant-400':'text-benign-400'}`}>{(prob*100).toFixed(1)}%</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.aiPrediction.suggestedBIRADS>=4?'bg-malignant-500/15 text-malignant-400':'bg-benign-500/15 text-benign-400'}`}>BI-RADS {c.aiPrediction.suggestedBIRADS}</span>
                </div>
                <div className="flex gap-2 pt-1 border-t t-border">
                  <button className="flex-1 py-1.5 rounded-lg bg-clinical-500/10 text-clinical-400 text-[10px] font-semibold">View</button>
                  <button className="flex-1 py-1.5 rounded-lg t-bg-el text-accent-400 text-[10px] font-semibold border t-border">Report</button>
                  <button className="p-1.5 rounded-lg t-bg-el t-text-tertiary border t-border"><Download className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {filteredCases.length > 0 && (
        <div className="px-3 sm:px-4 py-2.5 border-t t-border flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] sm:text-[11px] t-text-tertiary">Page {page} of {totalPages} · {filteredCases.length} records</span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={() => setPage(1)} disabled={page===1} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 t-bg-hover transition-all"><ChevronsLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 t-bg-hover transition-all"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pn: number;
              if (totalPages<=5) pn = i+1;
              else if (page<=3) pn = i+1;
              else if (page>=totalPages-2) pn = totalPages-4+i;
              else pn = page-2+i;
              return (
                <button key={pn} onClick={() => setPage(pn)} className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-all ${page===pn?'bg-clinical-500 text-white shadow-md shadow-clinical-500/20':'t-text-secondary t-bg-hover'}`}>{pn}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 t-bg-hover transition-all"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="p-1.5 rounded-lg t-text-tertiary disabled:opacity-30 t-bg-hover transition-all"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
