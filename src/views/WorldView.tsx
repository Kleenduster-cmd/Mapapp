import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Grid,
  Globe,
  Plus,
  Edit,
  Download,
  Palette,
  Scaling,
  ZoomIn,
  ZoomOut,
  Unlink,
  ExternalLink,
  X,
  MapPin,
  Check,
} from 'lucide-react';
import { WorldMap, GridMap } from '../types';
import { renderSeamlessWorld, renderGridMapToCanvas } from '../utils/canvasRenderer';
import { ExportModal } from '../components/ExportModal';
import { ResizeWorldModal } from '../components/ResizeWorldModal';
import { RenameModal } from '../components/RenameModal';
import { TileLegendModal } from '../components/TileLegendModal';

interface WorldViewProps {
  world: WorldMap;
  availableMaps: GridMap[];
  onSaveWorld: (updatedWorld: WorldMap) => void;
  onOpenMapEditor: (mapId: number, worldContextId: number) => void;
  onCreateAndLinkMap: (slotKey: string) => void;
  onBack: () => void;
}

export const WorldView: React.FC<WorldViewProps> = ({
  world,
  availableMaps,
  onSaveWorld,
  onOpenMapEditor,
  onCreateAndLinkMap,
  onBack,
}) => {
  const [currentWorld, setCurrentWorld] = useState<WorldMap>(world);
  const [viewMode, setViewMode] = useState<'sectors' | 'unified'>('sectors');
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [isColorOnlyMode, setIsColorOnlyMode] = useState<boolean>(false);

  // Unified Atlas pan & zoom
  const [atlasZoom, setAtlasZoom] = useState<number>(1);
  const [atlasPan, setAtlasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isAtlasPanningRef = useRef<boolean>(false);
  const startAtlasPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modals
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [selectedSlotForLinking, setSelectedSlotForLinking] = useState<{ col: number; row: number } | null>(null);

  const unifiedCanvasRef = useRef<HTMLCanvasElement>(null);
  const unifiedContainerRef = useRef<HTMLDivElement>(null);

  const mapLookup = React.useMemo(() => {
    const dict: Record<number, GridMap> = {};
    for (const m of availableMaps) dict[m.id] = m;
    return dict;
  }, [availableMaps]);

  const updateWorldState = (newWorld: WorldMap) => {
    setCurrentWorld(newWorld);
    onSaveWorld(newWorld);
  };

  // Redraw Unified Atlas
  useEffect(() => {
    if (viewMode !== 'unified' || !unifiedCanvasRef.current || !unifiedContainerRef.current) return;

    const canvas = unifiedCanvasRef.current;
    const container = unifiedContainerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#070B14';
    ctx.fillRect(0, 0, width, height);

    const standardSectorW = 16;
    const standardSectorH = 16;
    const baseCellSize = 24 * atlasZoom;

    const totalPixelW = currentWorld.gridCols * standardSectorW * baseCellSize;
    const totalPixelH = currentWorld.gridRows * standardSectorH * baseCellSize;

    const centerOffsetX = (width - totalPixelW) / 2 + atlasPan.x;
    const centerOffsetY = (height - totalPixelH) / 2 + atlasPan.y;

    renderSeamlessWorld(
      ctx,
      currentWorld,
      mapLookup,
      baseCellSize,
      showBorders,
      isColorOnlyMode,
      true,
      false,
      centerOffsetX,
      centerOffsetY
    );
  }, [viewMode, currentWorld, mapLookup, atlasZoom, atlasPan, showBorders, isColorOnlyMode]);

  // Click on unified atlas to find which sector was clicked
  const handleAtlasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!unifiedContainerRef.current) return;
    const rect = unifiedContainerRef.current.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    const standardSectorW = 16;
    const standardSectorH = 16;
    const baseCellSize = 24 * atlasZoom;

    const totalPixelW = currentWorld.gridCols * standardSectorW * baseCellSize;
    const totalPixelH = currentWorld.gridRows * standardSectorH * baseCellSize;

    const centerOffsetX = (rect.width - totalPixelW) / 2 + atlasPan.x;
    const centerOffsetY = (rect.height - totalPixelH) / 2 + atlasPan.y;

    const sectorPixelW = standardSectorW * baseCellSize;
    const sectorPixelH = standardSectorH * baseCellSize;

    const col = Math.floor((localX - centerOffsetX) / sectorPixelW);
    const row = Math.floor((localY - centerOffsetY) / sectorPixelH);

    if (col >= 0 && col < currentWorld.gridCols && row >= 0 && row < currentWorld.gridRows) {
      const slotKey = `${col}_${row}`;
      const mapId = currentWorld.slots[slotKey];
      if (mapId && mapLookup[mapId]) {
        onOpenMapEditor(mapId, currentWorld.id);
      } else {
        setSelectedSlotForLinking({ col, row });
      }
    }
  };

  // Slot Management actions
  const handleLinkMap = (col: number, row: number, mapId: number) => {
    const newSlots = { ...currentWorld.slots, [`${col}_${row}`]: mapId };
    updateWorldState({ ...currentWorld, slots: newSlots, updatedAt: Date.now() });
    setSelectedSlotForLinking(null);
  };

  const handleUnlinkMap = (col: number, row: number) => {
    const newSlots = { ...currentWorld.slots };
    delete newSlots[`${col}_${row}`];
    updateWorldState({ ...currentWorld, slots: newSlots, updatedAt: Date.now() });
    setSelectedSlotForLinking(null);
  };

  const handleResizeWorld = (newCols: number, newRows: number) => {
    const newSlots: Record<string, number> = {};
    for (const [key, mapId] of Object.entries(currentWorld.slots)) {
      const [c, r] = key.split('_').map(Number);
      if (c < newCols && r < newRows) {
        newSlots[key] = mapId;
      }
    }
    updateWorldState({
      ...currentWorld,
      gridCols: newCols,
      gridRows: newRows,
      slots: newSlots,
      updatedAt: Date.now(),
    });
  };

  // Composite virtual map for TileLegendModal
  const compositeWorldMapForLegend: GridMap = React.useMemo(() => {
    const allTiles = [];
    for (const mapId of Object.values(currentWorld.slots)) {
      const m = mapLookup[mapId];
      if (m) allTiles.push(...m.tiles);
    }
    return {
      id: currentWorld.id,
      name: currentWorld.name,
      width: currentWorld.gridCols * 16,
      height: currentWorld.gridRows * 16,
      tiles: allTiles.length > 0 ? allTiles : [{ terrain: 'grass', obj: '' }],
      createdAt: currentWorld.createdAt,
      updatedAt: currentWorld.updatedAt,
      description: currentWorld.description,
    };
  }, [currentWorld, mapLookup]);

  const connectedCount = Object.keys(currentWorld.slots).length;
  const totalSlots = currentWorld.gridCols * currentWorld.gridRows;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <h1
              onClick={() => setShowRenameModal(true)}
              className="font-bold text-sm sm:text-base text-slate-100 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-xs"
              title="Click to rename world"
            >
              <span className="truncate">{currentWorld.name}</span>
              <Edit className="w-3.5 h-3.5 opacity-50 shrink-0" />
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[11px] font-mono">
              {currentWorld.gridCols}×{currentWorld.gridRows} World ({connectedCount}/{totalSlots} linked)
            </span>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('sectors')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'sectors'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sector Cards</span>
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'unified'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unified Atlas</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLegendModal(true)}
            title="World Biome Legend"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowResizeModal(true)}
            title="Resize World Grid"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Scaling className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export World</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'sectors' ? (
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Click any sector card to open its editor or link a map to that slot.
              </p>
              <span className="text-xs font-mono text-slate-400">
                {currentWorld.gridCols} Columns × {currentWorld.gridRows} Rows
              </span>
            </div>

            {/* Sector Grid Matrix */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${currentWorld.gridCols}, minmax(180px, 1fr))`,
              }}
            >
              {Array.from({ length: currentWorld.gridRows }).map((_, r) =>
                Array.from({ length: currentWorld.gridCols }).map((_, c) => {
                  const slotKey = `${c}_${r}`;
                  const mapId = currentWorld.slots[slotKey];
                  const linkedMap = mapId ? mapLookup[mapId] : null;

                  return (
                    <SectorSlotCard
                      key={slotKey}
                      col={c}
                      row={r}
                      linkedMap={linkedMap}
                      onOpenEditor={() => {
                        if (linkedMap) {
                          onOpenMapEditor(linkedMap.id, currentWorld.id);
                        }
                      }}
                      onManageSlot={() => setSelectedSlotForLinking({ col: c, row: r })}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Atlas View */
        <div
          ref={unifiedContainerRef}
          onClick={handleAtlasClick}
          onPointerDown={e => {
            isAtlasPanningRef.current = true;
            startAtlasPanRef.current = { x: e.clientX - atlasPan.x, y: e.clientY - atlasPan.y };
          }}
          onPointerMove={e => {
            if (!isAtlasPanningRef.current) return;
            setAtlasPan({
              x: e.clientX - startAtlasPanRef.current.x,
              y: e.clientY - startAtlasPanRef.current.y,
            });
          }}
          onPointerUp={() => {
            isAtlasPanningRef.current = false;
          }}
          onWheel={e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.85;
            setAtlasZoom(prev => Math.max(0.3, Math.min(3.0, prev * factor)));
          }}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950"
        >
          <canvas ref={unifiedCanvasRef} className="absolute inset-0" />

          {/* Floating Controls */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 shadow-lg backdrop-blur-md">
            <button
              onClick={e => {
                e.stopPropagation();
                setShowBorders(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                showBorders ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Sector Borders</span>
            </button>

            <button
              onClick={e => {
                e.stopPropagation();
                setIsColorOnlyMode(prev => !prev);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isColorOnlyMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Flat Colors</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <button
              onClick={e => {
                e.stopPropagation();
                setAtlasZoom(prev => Math.max(0.3, prev - 0.2));
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-slate-300">
              {Math.round(atlasZoom * 100)}%
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                setAtlasZoom(prev => Math.min(3.0, prev + 0.2));
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 shadow-md backdrop-blur-xs">
            Tip: Click on any sector in the atlas to open it in editor mode.
          </div>
        </div>
      )}

      {/* Slot Link / Management Modal */}
      {selectedSlotForLinking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Manage Sector ({selectedSlotForLinking.col + 1}, {selectedSlotForLinking.row + 1})
                  </h2>
                  <p className="text-xs text-slate-400">Link or assign a map to this sector slot</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlotForLinking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
              {/* If currently linked */}
              {currentWorld.slots[`${selectedSlotForLinking.col}_${selectedSlotForLinking.row}`] && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
                      Currently Linked
                    </span>
                    <h4 className="font-bold text-slate-100 text-sm">
                      {mapLookup[currentWorld.slots[`${selectedSlotForLinking.col}_${selectedSlotForLinking.row}`]]?.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const mid = currentWorld.slots[`${selectedSlotForLinking.col}_${selectedSlotForLinking.row}`];
                        onOpenMapEditor(mid, currentWorld.id);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-md text-xs font-semibold text-white flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() =>
                        handleUnlinkMap(selectedSlotForLinking.col, selectedSlotForLinking.row)
                      }
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-md transition-colors"
                      title="Unlink map from this slot"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Create new map and link */}
              <button
                onClick={() => {
                  const slotKey = `${selectedSlotForLinking.col}_${selectedSlotForLinking.row}`;
                  onCreateAndLinkMap(slotKey);
                  setSelectedSlotForLinking(null);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-indigo-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Map for this Slot</span>
              </button>

              <div className="border-t border-slate-800 my-2" />

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Existing Map:
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableMaps.map(m => {
                    const isSelected =
                      currentWorld.slots[`${selectedSlotForLinking.col}_${selectedSlotForLinking.row}`] === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          handleLinkMap(selectedSlotForLinking.col, selectedSlotForLinking.row, m.id)
                        }
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs">{m.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {m.width}×{m.height} ({m.tiles.length} tiles)
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <span className="text-xs text-indigo-400 font-medium">Link</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setSelectedSlotForLinking(null)}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          worldMap={currentWorld}
          connectedMaps={mapLookup}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showResizeModal && (
        <ResizeWorldModal
          currentCols={currentWorld.gridCols}
          currentRows={currentWorld.gridRows}
          onConfirm={handleResizeWorld}
          onClose={() => setShowResizeModal(false)}
        />
      )}

      {showRenameModal && (
        <RenameModal
          title="Rename World Map"
          initialValue={currentWorld.name}
          onConfirm={newName => {
            updateWorldState({ ...currentWorld, name: newName, updatedAt: Date.now() });
          }}
          onClose={() => setShowRenameModal(false)}
        />
      )}

      {showLegendModal && (
        <TileLegendModal
          map={compositeWorldMapForLegend}
          isColorOnlyMode={isColorOnlyMode}
          onToggleColorOnlyMode={() => setIsColorOnlyMode(prev => !prev)}
          onClose={() => setShowLegendModal(false)}
        />
      )}
    </div>
  );
};

interface SectorSlotCardProps {
  col: number;
  row: number;
  linkedMap: GridMap | null;
  onOpenEditor: () => void;
  onManageSlot: () => void;
}

const SectorSlotCard: React.FC<SectorSlotCardProps> = ({
  col,
  row,
  linkedMap,
  onOpenEditor,
  onManageSlot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!linkedMap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const cellSize = 6;
    canvas.width = linkedMap.width * cellSize;
    canvas.height = linkedMap.height * cellSize;
    renderGridMapToCanvas(canvas, linkedMap, {
      cellSize,
      showGrid: false,
      colorOnlyMode: false,
    });
  }, [linkedMap]);

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-lg transition-all group">
      {/* Card Header Coordinate Tag */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 border-b border-slate-800">
        <span className="font-mono text-[11px] font-bold text-slate-400">
          Sector ({col + 1}, {row + 1})
        </span>
        <button
          onClick={onManageSlot}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {linkedMap ? 'Change' : 'Link Map'}
        </button>
      </div>

      {/* Card Body */}
      {linkedMap ? (
        <div
          onClick={onOpenEditor}
          className="p-3 flex-1 flex flex-col justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
        >
          <div className="h-32 bg-slate-950 rounded-lg flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-800/60">
            <canvas ref={canvasRef} className="rounded-xs shadow-xs" />
          </div>

          <div>
            <h3 className="font-bold text-xs text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
              {linkedMap.name}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {linkedMap.width}×{linkedMap.height} Grid Map
            </p>
          </div>

          <button
            onClick={e => {
              e.stopPropagation();
              onOpenEditor();
            }}
            className="w-full mt-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in Editor</span>
          </button>
        </div>
      ) : (
        <div
          onClick={onManageSlot}
          className="p-6 flex-1 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800/20 transition-colors border-2 border-dashed border-slate-800/60 m-3 rounded-lg"
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-slate-300">Unlinked Sector</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Click to link or create a map</span>
        </div>
      )}
    </div>
  );
};
