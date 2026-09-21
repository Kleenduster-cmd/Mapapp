import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { GridMap, WorldMap } from '../types';
import { parseMapJson } from '../utils/exporter';

interface ImportModalProps {
  onImportSuccess: (imported: { map?: GridMap; world?: WorldMap; connectedMaps?: GridMap[] }) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImportSuccess, onClose }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      if (content) {
        setJsonText(content);
        setError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      setError('Please paste JSON or upload a file first.');
      return;
    }
    const result = parseMapJson(jsonText);
    if (result.error) {
      setError(result.error);
      return;
    }
    onImportSuccess(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">Import Map or World</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm">
          {/* File drop / upload button */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Upload JSON File:
            </label>
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="text-slate-300 text-xs font-medium">Select .json file from device</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Or paste JSON string:
            </label>
            <textarea
              value={jsonText}
              onChange={e => {
                setJsonText(e.target.value);
                if (error) setError(null);
              }}
              rows={8}
              placeholder='Paste JSON data here (e.g. {"version": 1, "name": "My Map", "width": 16, "height": 16, ...})'
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
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
            onClick={handleImport}
            disabled={!jsonText.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Validate & Import</span>
          </button>
        </div>
      </div>
    </div>
  );
};
