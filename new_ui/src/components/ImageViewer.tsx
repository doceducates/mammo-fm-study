import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Move, Sun, Moon, Maximize2, RotateCcw,
  Layers, Eye, EyeOff, Grid3X3,
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import type { MammoImage } from '../types';

interface ImageViewerProps {
  images: MammoImage[];
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function ImageViewer({ images, activeView, onViewChange }: ImageViewerProps) {
  const { isDark } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [inverted, setInverted] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('single');
  const panStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images.find(img => img.view === activeView) || images[0];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); }, []);

  const resetView = () => { setZoom(1); setBrightness(100); setContrast(100); setInverted(false); setPanOffset({ x: 0, y: 0 }); };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const viewTabs = ['LCC', 'RCC', 'LMLO', 'RMLO'];

  const renderImage = (view: string, isSmall = false) => {
    const img = images.find(i => i.view === view) || images[0];
    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-lg">
        <img src={img.url} alt={view} className="w-full h-full object-contain transition-all duration-200" draggable={false}
          style={{
            filter: `brightness(${brightness}%) contrast(${contrast}%) ${inverted ? 'invert(1)' : ''}`,
            transform: isSmall ? 'scale(1)' : `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
          }}
        />
        <AnimatePresence>
          {heatmapVisible && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: heatmapOpacity }} exit={{ opacity: 0 }}
              className="absolute inset-0 heatmap-overlay pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 120px 150px at 55% 42%,rgba(255,0,0,0.8) 0%,rgba(255,165,0,0.4) 40%,transparent 70%),
                  radial-gradient(ellipse 70px 80px at 65% 58%,rgba(255,100,0,0.6) 0%,rgba(255,200,0,0.3) 40%,transparent 70%),
                  radial-gradient(ellipse 50px 50px at 35% 62%,rgba(255,200,0,0.4) 0%,rgba(0,255,0,0.2) 40%,transparent 70%)`,
              }}
            />
          )}
        </AnimatePresence>
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-black/70 border border-white/10">
          <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-white">{view}</span>
        </div>
        {heatmapVisible && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-clinical-400/40 to-transparent scan-animation" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* View Selector + Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-2 border-b t-border">
        {/* View tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {viewTabs.map((view) => (
            <button key={view} onClick={() => { onViewChange(view); setViewMode('single'); }}
              className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-semibold transition-all duration-200 flex-shrink-0 ${
                activeView === view && viewMode === 'single' ? 'text-clinical-400' : 't-text-tertiary hover:t-text-secondary t-bg-hover'
              }`}
            >
              {activeView === view && viewMode === 'single' && (
                <motion.div layoutId="viewTab" className="absolute inset-0 bg-clinical-500/10 border border-clinical-500/20 rounded-lg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <span className="relative">{view}</span>
            </button>
          ))}
          <div className={`w-px h-5 mx-1 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.08]'}`} />
          <button onClick={() => setViewMode('quad')}
            className={`p-1.5 rounded-lg transition-all duration-200 ${viewMode === 'quad' ? 'bg-clinical-500/10 text-clinical-400 border border-clinical-500/20' : 't-text-tertiary hover:t-text-secondary t-bg-hover'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 overflow-x-auto flex-shrink-0">
          <button onClick={() => setZoom(z => Math.min(z + 0.25, 5))} className="p-1.5 rounded-lg t-text-tertiary hover:t-text-primary t-bg-hover transition-all" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))} className="p-1.5 rounded-lg t-text-tertiary hover:t-text-primary t-bg-hover transition-all" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-[9px] sm:text-[10px] font-mono t-text-tertiary px-1 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
          <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.08]'}`} />
          <button className="p-1.5 rounded-lg t-text-tertiary hover:t-text-primary t-bg-hover transition-all hidden sm:block" title="Pan"><Move className="w-4 h-4" /></button>
          {/* Brightness + Contrast — hide labels on small */}
          <div className="hidden md:flex items-center gap-1">
            <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.08]'}`} />
            <Sun className="w-3.5 h-3.5 t-text-muted" />
            <input type="range" min="20" max="200" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-14 lg:w-16" title={`Brightness: ${brightness}%`} />
            <Moon className="w-3.5 h-3.5 t-text-muted ml-1" />
            <input type="range" min="20" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-14 lg:w-16" title={`Contrast: ${contrast}%`} />
          </div>
          <div className={`w-px h-5 mx-0.5 ${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.08]'}`} />
          <button onClick={() => setInverted(!inverted)} className={`p-1.5 rounded-lg transition-all ${inverted ? 'bg-caution-500/15 text-caution-400' : 't-text-tertiary hover:t-text-primary t-bg-hover'}`} title="Invert"><Layers className="w-4 h-4" /></button>
          <button onClick={resetView} className="p-1.5 rounded-lg t-text-tertiary hover:t-text-primary t-bg-hover transition-all" title="Reset"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg t-text-tertiary hover:t-text-primary t-bg-hover transition-all hidden sm:block" title="Fullscreen"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Heatmap Controls */}
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b t-border ${isDark ? 'bg-dark-900/50' : 'bg-gray-50/80'}`}>
        <button onClick={() => setHeatmapVisible(!heatmapVisible)}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all duration-300 ${
            heatmapVisible
              ? 'bg-gradient-to-r from-malignant-500/15 to-caution-500/15 text-malignant-400 border border-malignant-500/20'
              : `${isDark ? 'bg-white/[0.03] border-white/[0.05]' : 'bg-white border-gray-200'} t-text-tertiary hover:t-text-primary border`
          }`}>
          {heatmapVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          AI Attention Map
        </button>
        {heatmapVisible && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] sm:text-[10px] t-text-tertiary">Opacity</span>
            <input type="range" min="10" max="100" value={heatmapOpacity * 100} onChange={e => setHeatmapOpacity(Number(e.target.value) / 100)} className="w-20 sm:w-24" />
            <span className="text-[9px] sm:text-[10px] font-mono t-text-tertiary">{Math.round(heatmapOpacity * 100)}%</span>
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[9px] t-text-tertiary">High</span>
              <div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-[9px] t-text-tertiary">Med</span>
              <div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-[9px] t-text-tertiary">Low</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Image Canvas */}
      <div className="flex-1 bg-black relative cursor-crosshair overflow-hidden"
        onMouseDown={viewMode === 'single' ? handleMouseDown : undefined}
        onMouseMove={viewMode === 'single' ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewMode === 'single' ? (
          <AnimatePresence mode="wait">
            <motion.div key={activeView} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full h-full">
              {renderImage(activeView)}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-1 p-1 w-full h-full">
            {viewTabs.map(view => (
              <motion.div key={view} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="cursor-pointer hover:ring-1 hover:ring-clinical-500/30 rounded-lg overflow-hidden" onClick={() => { onViewChange(view); setViewMode('single'); }}>
                {renderImage(view, true)}
              </motion.div>
            ))}
          </div>
        )}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 flex flex-col items-end gap-1">
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-black/80 border border-white/10 text-[8px] sm:text-[9px] font-mono text-dark-200">
            {currentImage.width} × {currentImage.height}
          </div>
        </div>
      </div>
    </div>
  );
}
