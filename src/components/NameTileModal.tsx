import React, { useState } from 'react';
import { Tag, X, Check, Trash2, MapPin } from 'lucide-react';
import { GridTile } from '../types';
import { getTerrain, getMapObject } from '../constants/tiles';

interface NameTileModalProps {
  coord: { x: number; y: number };
  tile: GridTile;
  onSave: (label: string) => void;
  onClose: () => void;
}

const PRESET_NAMES = [
  'Spawn Point',
  'Boss Arena',
  'Secret Entrance',
  'Treasure Vault',
  'Camp Site',
  'Watchtower',
  'Ancient Shrine',
  'Town Gate',
  'Mystic Well',
  'Ambush Point',
  'Bridge Crossing',
  'Safe Haven',
];

export const NameTileModal: React.FC<NameTileModalProps> = ({
  coord,
  tile,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = useState<string>(tile.label || '');
  const terrain = getTerrain(tile.terrain);
  const obj = getMapObject(tile.obj);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(label.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Name / Label Tile</h2>
              <p className="text-xs text-slate-400 font-mono">
                Coordinate ({coord.x}, {coord.y})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Tile context pill */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div
                className="w-8 h-8 rounded-md border flex items-center justify-center text-lg shrink-0 shadow-inner"
                style={{
                  backgroundColor: terrain.baseColor,
                  borderColor: terrain.detailColor,
                }}
              >
                {obj?.iconEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {terrain.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {obj ? `Contains ${obj.title}` : 'No Structure'}
                </div>
              </div>
              <div className="px-2 py-1 bg-slate-800 rounded-md text-[11px] font-mono text-slate-400 shrink-0">
                X:{coord.x} Y:{coord.y}
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tile Name / Label:
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Dragon's Cave, West Gate, Sunken Crypt..."
                maxLength={36}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Names appear as label badges on the grid and in the map export.
              </p>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Quick Presets:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {PRESET_NAMES.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLabel(preset)}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            {tile.label ? (
              <button
                type="button"
                onClick={() => onSave('')}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Name</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
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
                <span>Save Label</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
