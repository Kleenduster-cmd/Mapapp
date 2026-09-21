import React, { useState } from 'react';
import { X, Image as ImageIcon, FileCode, Check, Copy, Download, Loader2 } from 'lucide-react';
import { GridMap, WorldMap } from '../types';
import {
  renderMapToBlob,
  renderWorldToBlob,
  downloadFile,
  exportMapToJsonString,
  exportWorldToJsonString,
} from '../utils/exporter';

interface ExportModalProps {
  map?: GridMap;
  worldMap?: WorldMap;
  connectedMaps?: Record<number, GridMap>;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  map,
  worldMap,
  connectedMaps = {},
  onClose,
}) => {
  const isWorld = Boolean(worldMap);
  const title = isWorld ? `Export "${worldMap?.name}"` : `Export "${map?.name}"`;

  const [activeTab, setActiveTab] = useState<'png' | 'json'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Map options
  const [includeGridLines, setIncludeGridLines] = useState(true);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeLabels, setIncludeLabels] = useState(true);
  const [includeElevation, setIncludeElevation] = useState(true);
  const [viewProjection, setViewProjection] = useState<'2D' | '2.5D'>('2D');
  const [colorOnlyMode, setColorOnlyMode] = useState(false);
  const [cellSize, setCellSize] = useState(48);

  // World options
  const [includeBorders, setIncludeBorders] = useState(true);

  const jsonContent = React.useMemo(() => {
    if (isWorld && worldMap) {
      return exportWorldToJsonString(worldMap, connectedMaps);
    }
    if (map) {
      return exportMapToJsonString(map);
    }
    return '';
  }, [isWorld, worldMap, connectedMaps, map]);

  const handleExportPng = async () => {
    setIsExporting(true);
    try {
      if (isWorld && worldMap) {
        const blob = await renderWorldToBlob(worldMap, connectedMaps, {
          cellSize,
          includeGridLines,
          includeBorders,
          includeLegend,
          colorOnlyMode,
          includeLabels,
          includeElevation,
        });
        downloadFile(blob, `${worldMap.name.toLowerCase().replace(/\s+/g, '_')}_world.png`);
      } else if (map) {
        const blob = await renderMapToBlob(map, {
          cellSize,
          includeGridLines,
          includeTitle,
          includeLegend,
          colorOnlyMode,
          includeLabels,
          includeElevation,
          viewProjection,
        });
        downloadFile(blob, `${map.name.toLowerCase().replace(/\s+/g, '_')}_${viewProjection.toLowerCase()}.png`);
      }
      onClose();
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to generate PNG image.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const filename = isWorld
      ? `${worldMap?.name.toLowerCase().replace(/\s+/g, '_')}_bundle.json`
      : `${map?.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    downloadFile(blob, filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <h2 className="text-lg font-bold text-slate-100 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('png')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'png'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            {isWorld ? 'Stitched World PNG' : 'PNG Image'}
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            {isWorld ? 'World Bundle JSON' : 'JSON Data'}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {activeTab === 'png' ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rendering & Export Options
              </h3>

              <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                {!isWorld && (
                  <div className="pb-3 border-b border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-200 font-medium text-xs">Perspective / Projection</span>
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                      <button
                        type="button"
                        onClick={() => setViewProjection('2D')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          viewProjection === '2D'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        2D Top-Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewProjection('2.5D')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          viewProjection === '2.5D'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        2.5D Isometric
                      </button>
                    </div>
                  </div>
                )}

                {isWorld ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBorders}
                      onChange={e => setIncludeBorders(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-200">Show Sector Boundaries</span>
                  </label>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTitle}
                      onChange={e => setIncludeTitle(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-slate-200">Include Header Title Banner</span>
                  </label>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGridLines}
                    onChange={e => setIncludeGridLines(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200">
                    {isWorld ? 'Show Local Tile Grid' : 'Include Grid Lines'}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeElevation}
                    onChange={e => setIncludeElevation(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200">Include Elevation Badges & Depth</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLegend}
                    onChange={e => setIncludeLegend(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200">Include Tile & Color Legend</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLabels}
                    onChange={e => setIncludeLabels(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200">Include Tile Name Badges</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colorOnlyMode}
                    onChange={e => setColorOnlyMode(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200">Color-Based Flat Style (Solid Colors)</span>
                </label>
              </div>

              {/* Resolution selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Resolution / Tile Size:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { size: isWorld ? 24 : 32, label: 'Compact' },
                    { size: isWorld ? 32 : 48, label: 'Standard' },
                    { size: isWorld ? 48 : 64, label: 'Ultra HD' },
                  ].map(opt => (
                    <button
                      key={opt.size}
                      type="button"
                      onClick={() => setCellSize(opt.size)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                        cellSize === opt.size
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {cellSize === opt.size && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      <span>{opt.label} ({opt.size}px)</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension estimate */}
              <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                Estimated output size:{' '}
                <span className="font-mono text-slate-200">
                  {isWorld && worldMap
                    ? `${worldMap.gridCols * 16 * cellSize} × ${worldMap.gridRows * 16 * cellSize + 80 + (includeLegend ? 80 : 0)} px`
                    : map
                    ? `${map.width * cellSize} × ${map.height * cellSize + (includeTitle ? 80 : 0) + (includeLegend ? 90 : 0)} px`
                    : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                {isWorld
                  ? 'Exports the complete world structure including all connected sector maps into a JSON bundle.'
                  : 'Export the raw structure of this grid map. You can save it as a file, backup, or share with other players.'}
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Format: JSON Map Format v1</span>
                  <span>{isWorld ? `${Object.keys(worldMap?.slots || {}).length} maps linked` : `${map?.tiles.length} tiles`}</span>
                </div>
                <pre className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-sm select-all">
                  {jsonContent.slice(0, 1500) + (jsonContent.length > 1500 ? '\n... (truncated for preview)' : '')}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'png' ? (
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering PNG...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Save / Download PNG</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
              >
                <Download className="w-4 h-4" />
                <span>Download JSON</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
