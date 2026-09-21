import React, { useMemo } from 'react';
import { X, Palette, Paintbrush } from 'lucide-react';
import { GridMap } from '../types';
import { getTerrain, getMapObject } from '../constants/tiles';

interface TileLegendModalProps {
  map: GridMap;
  isColorOnlyMode: boolean;
  onToggleColorOnlyMode: () => void;
  onSelectTerrain?: (terrainId: string) => void;
  onClose: () => void;
}

export const TileLegendModal: React.FC<TileLegendModalProps> = ({
  map,
  isColorOnlyMode,
  onToggleColorOnlyMode,
  onSelectTerrain,
  onClose,
}) => {
  const totalTiles = Math.max(1, map.tiles.length);

  const terrainStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tile of map.tiles) {
      counts.set(tile.terrain, (counts.get(tile.terrain) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => {
        const terrain = getTerrain(id);
        return {
          terrain,
          count,
          percentage: (count / totalTiles) * 100,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [map.tiles, totalTiles]);

  const objectStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tile of map.tiles) {
      if (tile.obj) {
        counts.set(tile.obj, (counts.get(tile.obj) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => {
        const obj = getMapObject(id);
        return { obj, count };
      })
      .filter(item => item.obj !== null)
      .sort((a, b) => b.count - a.count);
  }, [map.tiles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Tile & Color Legend</h2>
              <p className="text-xs text-slate-400">
                {terrainStats.length} Biomes • {map.width}×{map.height} Grid ({map.tiles.length} tiles)
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Color-Based Mode Switch */}
          <div className="flex items-center justify-between p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div>
              <div className="font-semibold text-slate-200">Color-Based View</div>
              <div className="text-xs text-slate-400">
                {isColorOnlyMode ? 'Solid flat color blocks enabled' : 'Stylized procedural textures enabled'}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleColorOnlyMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isColorOnlyMode ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isColorOnlyMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Terrains Section */}
          <div>
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
              Terrain Biome Colors
            </h3>
            <div className="space-y-2">
              {terrainStats.map(({ terrain, count, percentage }) => (
                <div
                  key={terrain.id}
                  onClick={() => {
                    if (onSelectTerrain) {
                      onSelectTerrain(terrain.id);
                      onClose();
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800/80 transition-colors ${
                    onSelectTerrain ? 'cursor-pointer hover:border-indigo-500/50' : ''
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 border-2 shadow-xs"
                    style={{
                      backgroundColor: terrain.baseColor,
                      borderColor: terrain.detailColor,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200 truncate">{terrain.title}</span>
                      <span className="text-xs text-slate-400">
                        {count} tiles ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="font-mono text-xs text-slate-400">{terrain.baseColor.toUpperCase()}</span>
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: terrain.baseColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {onSelectTerrain && (
                    <Paintbrush className="w-4 h-4 text-indigo-400 opacity-60 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Objects Section */}
          {objectStats.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
                Structures & Markers
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {objectStats.map(item => (
                  <div
                    key={item.obj!.id}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-800 bg-slate-800/40"
                  >
                    <span className="text-xl">{item.obj!.iconEmoji}</span>
                    <div className="truncate">
                      <div className="font-medium text-slate-200 text-xs truncate">{item.obj!.title}</div>
                      <div className="text-[11px] text-slate-400">{item.count} placed</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
