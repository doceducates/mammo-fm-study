import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Download, Save, CheckCircle2, AlertCircle, RefreshCw, Eye, Edit3, 
  History, RotateCcw, Tag, Bold, Italic, Heading1, Heading2, Heading3, List, Quote, Undo, Redo
} from 'lucide-react';
import { 
  fetchSynopsis, saveSynopsis, fetchSynopsisVersions, restoreSynopsisVersion, 
  downloadSynopsisDocx, downloadSynopsisPdf 
} from '../api';

interface VersionItem {
  id: number;
  version_tag: string;
  word_count: number;
  author: string;
  is_active: boolean;
  created_at: string;
}

export const SynopsisCenter: React.FC = () => {
  const [content, setContent] = useState<string>('Loading research synopsis...');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('edit');
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [versionTagInput, setVersionTagInput] = useState<string>('UHS Board Draft');
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadContent();
    loadVersions();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    const data = await fetchSynopsis();
    setContent(data);
    setLoading(false);
  };

  const loadVersions = async () => {
    const vList = await fetchSynopsisVersions();
    setVersions(vList);
  };

  const handleSave = async (tag: string = "Draft Update") => {
    setSaving(true);
    const success = await saveSynopsis(content, tag);
    setSaving(false);
    setShowTagModal(false);
    if (success) {
      setNotification({ type: 'success', message: `Saved version "${tag}" to database!` });
      loadVersions();
    } else {
      setNotification({ type: 'error', message: 'Failed to save synopsis.' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRestore = async (versionId: number, tag: string) => {
    setSaving(true);
    const success = await restoreSynopsisVersion(versionId);
    setSaving(false);
    if (success) {
      setNotification({ type: 'success', message: `Restored version "${tag}"!` });
      await loadContent();
      await loadVersions();
    } else {
      setNotification({ type: 'error', message: 'Failed to restore version.' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper for Rich Formatting Toolbar
  const insertFormatting = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const replacement = prefix + (selectedText || 'text') + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                UHS Synopsis Hub & Version Manager
                <span className="text-xs font-mono font-normal bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                  Database Persisted
                </span>
              </h2>
              <p className="text-sm text-slate-400">
                Live WYSIWYG Editing • Database Version Control • UHS Word (.docx) & PDF Export
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <History className="w-4 h-4 text-blue-400" />
            Version History ({versions.length})
          </button>
          <button
            onClick={() => setShowTagModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-blue-900/30"
          >
            <Save className="w-4 h-4" />
            Save Named Version
          </button>
          <button
            onClick={downloadSynopsisDocx}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Word (.docx)
          </button>
          <button
            onClick={downloadSynopsisPdf}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-purple-400" />
            PDF (.pdf)
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          {notification.message}
        </div>
      )}

      {/* Mode Switcher & Formatting Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'edit' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            WYSIWYG Editor
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'preview' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Formatted Preview
          </button>
        </div>

        {/* Formatting Toolbar */}
        {activeTab === 'edit' && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button onClick={() => insertFormatting('**', '**')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => insertFormatting('*', '*')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button onClick={() => insertFormatting('\n# ')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Heading 1">
              <Heading1 className="w-4 h-4" />
            </button>
            <button onClick={() => insertFormatting('\n## ')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Heading 2">
              <Heading2 className="w-4 h-4" />
            </button>
            <button onClick={() => insertFormatting('\n### ')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Heading 3">
              <Heading3 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1" />
            <button onClick={() => insertFormatting('\n- ')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Bullet List">
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => insertFormatting('\n> ')} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded" title="Quote">
              <Quote className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-xs text-slate-400 font-mono">
          Word Count: {content.split(/\s+/).filter(Boolean).length} words
        </div>
      </div>

      {/* Main Grid: Editor & Version History Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Editor / Preview Area */}
        <div className={`${showVersionHistory ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl min-h-[650px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Loading research synopsis...</p>
              </div>
            ) : activeTab === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-[700px] bg-slate-950 text-slate-200 font-mono text-sm p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
                placeholder="Edit research synopsis markdown..."
              />
            ) : (
              <div className="prose prose-invert max-w-none space-y-4 text-slate-300 font-sans text-sm leading-relaxed">
                {content.split('\n').map((line, idx) => {
                  const str = line.trim();
                  if (!str) return null;
                  if (str.startsWith('# ')) {
                    return (
                      <h1 key={idx} className="text-2xl font-extrabold text-blue-400 border-b border-slate-800 pb-3 mt-6 mb-4">
                        {str.replace('# ', '')}
                      </h1>
                    );
                  }
                  if (str.startsWith('## ')) {
                    return (
                      <h2 key={idx} className="text-lg font-bold text-slate-100 mt-6 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {str.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (str.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-md font-semibold text-slate-300 mt-4 mb-2">
                        {str.replace('### ', '')}
                      </h3>
                    );
                  }
                  return (
                    <p key={idx} className="text-slate-300 leading-relaxed">
                      {str}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Version History Sidebar Drawer */}
        {showVersionHistory && (
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                Revision History
              </h3>
              <button onClick={() => setShowVersionHistory(false)} className="text-xs text-slate-400 hover:text-slate-200">
                Close
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {versions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No saved versions yet.</p>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      v.is_active ? 'bg-blue-950/40 border-blue-800/60' : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-blue-400" />
                        {v.version_tag}
                      </span>
                      {v.is_active && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      <div>{v.created_at}</div>
                      <div>{v.word_count} words • {v.author}</div>
                    </div>
                    {!v.is_active && (
                      <button
                        onClick={() => handleRestore(v.id, v.version_tag)}
                        className="w-full mt-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-400" />
                        Restore This Draft
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Version Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" />
              Save Named Version Snapshot
            </h3>
            <p className="text-xs text-slate-400">
              Assign a label to this draft version for database persistence and audit tracking.
            </p>
            <input
              type="text"
              value={versionTagInput}
              onChange={(e) => setVersionTagInput(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 text-sm p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500"
              placeholder="e.g. UHS Board Final Draft 1.0"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(versionTagInput)}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors"
              >
                {saving ? 'Saving to Database...' : 'Save Version Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
