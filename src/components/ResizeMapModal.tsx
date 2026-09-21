import React, { useState } from 'react';
import { X, Scaling, Check } from 'lucide-react';

interface ResizeMapModalProps {
  currentWidth: number;
  currentHeight: number;
  onConfirm: (newWidth: number, newHeight: number) => void;
  onClose: () => void;
}

export const ResizeMapModal: React.FC<ResizeMapModalProps> = ({
  currentWidth,
  currentHeight,
  onConfirm,
  onClose,
}) => {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);

  const presets = [
    { w: 8, h: 8, label: '8×8' },
    { w: 12, h: 12, label: '12×12' },
    { w: 16, h: 16, label: '16×16' },
    { w: 20, h: 20, label: '20×20' },
    { w: 24, h: 24, label: '24×24' },
    { w: 32, h: 32, label: '32×32' },
  ];

  const handleConfirm = () => {
    onConfirm(width, height);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Scaling className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Resize Map Grid</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <p className="text-xs text-slate-400">
            Existing tiles inside the new boundaries will be preserved. Expanding the map fills new cells with default grass.
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setWidth(p.w);
                  setHeight(p.h);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                  width === p.w && height === p.h
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16">Width:</span>
              <input
                type="range"
                min="4"
                max="64"
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="font-mono text-xs text-slate-200 w-8 text-right">{width}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16">Height:</span>
              <input
                type="range"
                min="4"
                max="64"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="font-mono text-xs text-slate-200 w-8 text-right">{height}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-amber-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Apply Resize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
