import React, { useState } from 'react';
import { X, Scaling, Check } from 'lucide-react';

interface ResizeWorldModalProps {
  currentCols: number;
  currentRows: number;
  onConfirm: (newCols: number, newRows: number) => void;
  onClose: () => void;
}

export const ResizeWorldModal: React.FC<ResizeWorldModalProps> = ({
  currentCols,
  currentRows,
  onConfirm,
  onClose,
}) => {
  const [cols, setCols] = useState(currentCols);
  const [rows, setRows] = useState(currentRows);

  const presets = [
    { c: 2, r: 2, label: '2×2' },
    { c: 3, r: 3, label: '3×3' },
    { c: 4, r: 4, label: '4×4' },
    { c: 5, r: 5, label: '5×5' },
    { c: 6, r: 6, label: '6×6' },
  ];

  const handleConfirm = () => {
    onConfirm(cols, rows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Scaling className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Resize World Grid</h2>
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
            Existing sector maps in preserved coordinates remain intact.
          </p>

          <div className="grid grid-cols-5 gap-1.5">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setCols(p.c);
                  setRows(p.r);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                  cols === p.c && rows === p.r
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16">Columns:</span>
              <input
                type="range"
                min="2"
                max="8"
                value={cols}
                onChange={e => setCols(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="font-mono text-xs text-slate-200 w-8 text-right">{cols}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-16">Rows:</span>
              <input
                type="range"
                min="2"
                max="8"
                value={rows}
                onChange={e => setRows(Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="font-mono text-xs text-slate-200 w-8 text-right">{rows}</span>
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
          >
            <Check className="w-4 h-4" />
            <span>Apply Resize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
