import React, { useState } from 'react';
import { X, Globe, Plus } from 'lucide-react';

interface CreateWorldModalProps {
  onConfirm: (name: string, gridCols: number, gridRows: number, description: string) => void;
  onClose: () => void;
}

export const CreateWorldModal: React.FC<CreateWorldModalProps> = ({ onConfirm, onClose }) => {
  const [name, setName] = useState('');
  const [gridCols, setGridCols] = useState(3);
  const [gridRows, setGridRows] = useState(3);
  const [description, setDescription] = useState('');

  const quickPresets = [
    { cols: 2, rows: 2, label: '2×2 (Small Realm)' },
    { cols: 3, rows: 3, label: '3×3 (Standard Kingdom)' },
    { cols: 4, rows: 4, label: '4×4 (Large Continent)' },
    { cols: 5, rows: 5, label: '5×5 (Grand Empire)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), gridCols, gridRows, description.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">New World Map</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              World Map Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Lands of Eldoria, Shadow Archipelago"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sector Layout: <span className="text-indigo-400 font-mono">{gridCols} × {gridRows}</span> ({gridCols * gridRows} Sector Slots)
            </label>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {quickPresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setGridCols(preset.cols);
                    setGridRows(preset.rows);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    gridCols === preset.cols && gridRows === preset.rows
                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                      : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">Columns:</span>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={gridCols}
                  onChange={e => setGridCols(Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-mono text-xs text-slate-300 w-6 text-right">{gridCols}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-16">Rows:</span>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={gridRows}
                  onChange={e => setGridRows(Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-mono text-xs text-slate-300 w-6 text-right">{gridRows}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Lore, campaign setting notes, or regional info..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create World</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
