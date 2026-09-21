import React, { useState } from 'react';
import { X, Map, Plus } from 'lucide-react';
import { TERRAIN_TYPES } from '../constants/tiles';

interface CreateMapModalProps {
  onConfirm: (name: string, width: number, height: number, initialTerrain: string, description: string) => void;
  onClose: () => void;
}

export const CreateMapModal: React.FC<CreateMapModalProps> = ({ onConfirm, onClose }) => {
  const [name, setName] = useState('');
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);
  const [initialTerrain, setInitialTerrain] = useState('grass');
  const [description, setDescription] = useState('');

  const quickPresets = [
    { w: 8, h: 8, label: '8×8 (Skirmish)' },
    { w: 12, h: 12, label: '12×12 (Encounter)' },
    { w: 16, h: 16, label: '16×16 (Standard)' },
    { w: 20, h: 20, label: '20×20 (Dungeon)' },
    { w: 24, h: 24, label: '24×24 (Large)' },
    { w: 32, h: 32, label: '32×32 (Epic)' },
  ];

  const terrainOptions = [
    'grass',
    'deep_water',
    'mountain',
    'forest',
    'sand',
    'snow',
    'dungeon_floor',
    'chasm',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), width, height, initialTerrain, description.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Map className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">New Grid Map</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Map Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Goblin Lair, Coastal Fortress"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dimensions: <span className="text-emerald-400 font-mono">{width} × {height}</span> ({width * height} tiles)
            </label>

            {/* Quick preset chips */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {quickPresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setWidth(preset.w);
                    setHeight(preset.h);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    width === preset.w && height === preset.h
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Dimension Sliders */}
            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-12">Width:</span>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={width}
                  onChange={e => setWidth(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="font-mono text-xs text-slate-300 w-8 text-right">{width}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-12">Height:</span>
                <input
                  type="range"
                  min="4"
                  max="64"
                  value={height}
                  onChange={e => setHeight(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="font-mono text-xs text-slate-300 w-8 text-right">{height}</span>
              </div>
            </div>
          </div>

          {/* Initial Base Terrain */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Initial Terrain Base:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {terrainOptions.map(tid => {
                const t = TERRAIN_TYPES.find(item => item.id === tid);
                if (!t) return null;
                const isSelected = initialTerrain === tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setInitialTerrain(tid)}
                    className={`flex flex-col items-center p-2 rounded-lg border text-xs transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md mb-1 border"
                      style={{ backgroundColor: t.baseColor, borderColor: t.detailColor }}
                    />
                    <span className="truncate w-full text-center text-[10px]">{t.title.split('/')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Short notes or setting description..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Map</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
