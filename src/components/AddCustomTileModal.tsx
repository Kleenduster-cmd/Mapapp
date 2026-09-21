import React, { useState } from 'react';
import { Plus, X, Palette, Sparkles, Check } from 'lucide-react';
import { TerrainDef, MapObjectDef } from '../types';
import { drawTile } from '../utils/canvasRenderer';

interface AddCustomTileModalProps {
  initialTab?: 'terrain' | 'object';
  onAddTerrain: (newTerrain: TerrainDef) => void;
  onAddObject: (newObject: MapObjectDef) => void;
  onClose: () => void;
}

const PRESET_BASE_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Purple
  '#C026D3', // Fuchsia
  '#DB2777', // Pink
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#CA8A04', // Yellow
  '#65A30D', // Lime
  '#16A34A', // Emerald
  '#0D9488', // Teal
  '#0891B2', // Cyan
  '#0284C7', // Sky
  '#2563EB', // Blue
  '#475569', // Slate
  '#1E293B', // Dark Navy
];

const PRESET_DETAIL_COLORS = [
  '#312E81',
  '#4C1D95',
  '#701A75',
  '#831843',
  '#7F1D1D',
  '#7C2D12',
  '#78350F',
  '#713F12',
  '#365314',
  '#14532D',
  '#134E4A',
  '#164E63',
  '#0C4A6E',
  '#1E3A8A',
  '#0F172A',
  '#F8FAFC',
];

const PRESET_EMOJIS = [
  '🗿', '⛩️', '💎', '🌋', '⛺', '🐉', '⚔️', '🛡️',
  '👑', '🔮', '📜', '🏹', '🍺', '🪙', '🏴‍☠️', '⚓',
  '🛸', '🚪', '🕯️', '🛖', '⛲', '🪨', '🍄', '🕸️'
];

export const AddCustomTileModal: React.FC<AddCustomTileModalProps> = ({
  initialTab = 'terrain',
  onAddTerrain,
  onAddObject,
  onClose,
}) => {
  const [mode, setMode] = useState<'terrain' | 'object'>(initialTab);

  // Terrain Form State
  const [terrainTitle, setTerrainTitle] = useState('');
  const [baseColor, setBaseColor] = useState('#7C3AED');
  const [detailColor, setDetailColor] = useState('#4C1D95');
  const [category, setCategory] = useState<TerrainDef['category']>('Custom');

  // Object Form State
  const [objectTitle, setObjectTitle] = useState('');
  const [iconEmoji, setIconEmoji] = useState('💎');
  const [objectColor, setObjectColor] = useState('#E5E9F0');

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Live Canvas Preview
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = 64;
    canvas.width = s;
    canvas.height = s;

    if (mode === 'terrain') {
      const mockTile = { terrain: 'preview_temp', obj: '' };
      // Temporarily mock renderer
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, s, s);

      // Detail texture
      ctx.strokeStyle = detailColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.2);
      ctx.lineTo(s * 0.4, s * 0.4);
      ctx.moveTo(s * 0.6, s * 0.6);
      ctx.lineTo(s * 0.8, s * 0.8);
      ctx.stroke();

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, s, s);
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, s, s);
      ctx.font = '36px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconEmoji, s / 2, s / 2 + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, s, s);
    }
  }, [mode, baseColor, detailColor, iconEmoji]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'terrain') {
      const name = terrainTitle.trim() || 'Custom Tile';
      const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
      const newTerrain: TerrainDef = {
        id,
        title: name,
        baseColor,
        detailColor,
        category,
        isCustom: true,
      };
      onAddTerrain(newTerrain);
    } else {
      const name = objectTitle.trim() || 'Custom Marker';
      const id = 'custom_obj_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
      const newObj: MapObjectDef = {
        id,
        title: name,
        iconEmoji: iconEmoji || '📍',
        color: objectColor,
        isCustom: true,
      };
      onAddObject(newObj);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Add & Name Custom Tile</h2>
              <p className="text-xs text-slate-400">Design custom terrain or map markers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5">
          <button
            type="button"
            onClick={() => setMode('terrain')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'terrain'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Custom Terrain Tile</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('object')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'object'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Custom Object / Marker</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Live Preview Box */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <canvas
                ref={canvasRef}
                className="w-16 h-16 rounded-lg shadow-md border border-slate-700 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold">
                  Live Preview
                </span>
                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {mode === 'terrain'
                    ? terrainTitle.trim() || 'Untitled Terrain Tile'
                    : objectTitle.trim() || 'Untitled Object Marker'}
                </h4>
                <p className="text-xs text-slate-400">
                  {mode === 'terrain'
                    ? `Category: ${category} • Custom Tile`
                    : `Emoji: ${iconEmoji} • Marker`}
                </p>
              </div>
            </div>

            {mode === 'terrain' ? (
              <>
                {/* Terrain Tile Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tile Name: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={terrainTitle}
                    onChange={e => setTerrainTitle(e.target.value)}
                    placeholder="e.g. Crystal Cavern, Toxic Mire, Amethyst Grove, Golden Sand..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tile Category:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Custom', 'Natural', 'Water', 'Hazard', 'Dungeon', 'Structure', 'Path'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          category === cat
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Color Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Base Background Color:
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{baseColor}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={baseColor}
                      onChange={e => setBaseColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={baseColor}
                      onChange={e => setBaseColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {PRESET_BASE_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBaseColor(c)}
                        className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${
                          baseColor === c ? 'ring-2 ring-white scale-110' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Detail Accent Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Texture / Accent Color:
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">{detailColor}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={detailColor}
                      onChange={e => setDetailColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-slate-950 p-1"
                    />
                    <input
                      type="text"
                      value={detailColor}
                      onChange={e => setDetailColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {PRESET_DETAIL_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDetailColor(c)}
                        className={`w-7 h-7 rounded-md border transition-transform hover:scale-110 ${
                          detailColor === c ? 'ring-2 ring-white scale-110' : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Object Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Object / Marker Name: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={objectTitle}
                    onChange={e => setObjectTitle(e.target.value)}
                    placeholder="e.g. Sacred Monolith, Dragon Nest, Ancient Well, Windmill..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Emoji Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Icon / Emoji:
                    </label>
                    <span className="text-lg">{iconEmoji}</span>
                  </div>
                  <input
                    type="text"
                    value={iconEmoji}
                    onChange={e => setIconEmoji(e.target.value)}
                    maxLength={4}
                    placeholder="Type or paste any emoji..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 mb-2"
                  />
                  <div className="grid grid-cols-8 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {PRESET_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIconEmoji(em)}
                        className={`w-8 h-8 rounded-md text-lg flex items-center justify-center hover:bg-slate-800 transition-colors ${
                          iconEmoji === em ? 'bg-indigo-600/30 border border-indigo-500' : ''
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{mode === 'terrain' ? 'Add & Save Tile' : 'Add & Save Object'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
