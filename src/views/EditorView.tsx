import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Palette,
  Scaling,
  Download,
  MoreVertical,
  Paintbrush,
  PaintBucket,
  Eraser,
  Pipette,
  Hand,
  Edit,
  Trash,
} from 'lucide-react';
import { GridMap, EditorTool, GridTile, TileMutation } from '../types';
import { TERRAIN_TYPES, MAP_OBJECTS, getTerrain, getMapObject } from '../constants/tiles';
import { drawTile } from '../utils/canvasRenderer';
import { TileLegendModal } from '../components/TileLegendModal';
import { ExportModal } from '../components/ExportModal';
import { ResizeMapModal } from '../components/ResizeMapModal';
import { RenameModal } from '../components/RenameModal';

interface EditorViewProps {
  initialMap: GridMap;
  worldMapContextId?: number;
  onSaveMap: (updatedMap: GridMap) => void;
  onBack: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  initialMap,
  worldMapContextId,
  onSaveMap,
  onBack,
}) => {
  const [map, setMap] = useState<GridMap>(initialMap);

  // Tools & selection
  const [activeTool, setActiveTool] = useState<EditorTool>('BRUSH');
  const [brushSize, setBrushSize] = useState<number>(1);
  const [selectedTerrain, setSelectedTerrain] = useState<string>('grass');
  const [selectedObject, setSelectedObject] = useState<string>('');
  const [paletteTab, setPaletteTab] = useState<0 | 1>(0);

  // Canvas View state
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isColorOnlyMode, setIsColorOnlyMode] = useState<boolean>(false);

  // Hover coordinate state
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<TileMutation[][]>([]);
  const [redoStack, setRedoStack] = useState<TileMutation[][]>([]);
  const currentBatchRef = useRef<TileMutation[]>([]);
  const isInteractingRef = useRef<boolean>(false);
  const lastCellRef = useRef<{ x: number; y: number } | null>(null);

  // Dragging for pan mode
  const isPanningRef = useRef<boolean>(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modals
  const [showLegendModal, setShowLegendModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep parent updated on map changes
  const updateMapState = (newMap: GridMap) => {
    setMap(newMap);
    onSaveMap(newMap);
  };

  // Base cell size fitting container
  const computeBaseCellSize = useCallback(() => {
    if (!containerRef.current) return 32;
    const { clientWidth, clientHeight } = containerRef.current;
    const fitW = (clientWidth * 0.88) / map.width;
    const fitH = (clientHeight * 0.88) / map.height;
    return Math.max(16, Math.min(64, Math.min(fitW, fitH)));
  }, [map.width, map.height]);

  const [baseCellSize, setBaseCellSize] = useState<number>(32);

  useEffect(() => {
    const handleResize = () => setBaseCellSize(computeBaseCellSize());
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computeBaseCellSize]);

  // Redraw Canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const effectiveCellSize = baseCellSize * zoom;
    const mapPixelW = map.width * effectiveCellSize;
    const mapPixelH = map.height * effectiveCellSize;

    const centerOffsetX = (width - mapPixelW) / 2;
    const centerOffsetY = (height - mapPixelH) / 2;

    const totalOffsetX = centerOffsetX + panOffset.x;
    const totalOffsetY = centerOffsetY + panOffset.y;

    // Draw all cells
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const drawX = totalOffsetX + x * effectiveCellSize;
        const drawY = totalOffsetY + y * effectiveCellSize;

        // Frustum culling
        if (
          drawX + effectiveCellSize < 0 ||
          drawX > width ||
          drawY + effectiveCellSize < 0 ||
          drawY > height
        ) {
          continue;
        }

        const tile = map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' };
        drawTile(ctx, tile, drawX, drawY, effectiveCellSize, showGrid, isColorOnlyMode);
      }
    }

    // Outer Map Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(totalOffsetX, totalOffsetY, mapPixelW, mapPixelH);

    // Hover Highlight
    if (
      !isPanMode &&
      hoverCoord &&
      hoverCoord.x >= 0 &&
      hoverCoord.x < map.width &&
      hoverCoord.y >= 0 &&
      hoverCoord.y < map.height
    ) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        totalOffsetX + hoverCoord.x * effectiveCellSize,
        totalOffsetY + hoverCoord.y * effectiveCellSize,
        effectiveCellSize,
        effectiveCellSize
      );
    }
  }, [baseCellSize, isColorOnlyMode, isPanMode, map, panOffset, showGrid, zoom, hoverCoord]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Screen to grid coordinates conversion
  const screenToGrid = (screenX: number, screenY: number): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;

    const effectiveCellSize = baseCellSize * zoom;
    const mapPixelW = map.width * effectiveCellSize;
    const mapPixelH = map.height * effectiveCellSize;

    const centerOffsetX = (rect.width - mapPixelW) / 2;
    const centerOffsetY = (rect.height - mapPixelH) / 2;

    const totalOffsetX = centerOffsetX + panOffset.x;
    const totalOffsetY = centerOffsetY + panOffset.y;

    const cellX = Math.floor((localX - totalOffsetX) / effectiveCellSize);
    const cellY = Math.floor((localY - totalOffsetY) / effectiveCellSize);

    return { x: cellX, y: cellY };
  };

  // Mutate single cell
  const mutateCell = (cx: number, cy: number, currentMap: GridMap): GridMap => {
    if (cx < 0 || cx >= currentMap.width || cy < 0 || cy >= currentMap.height) {
      return currentMap;
    }

    const idx = cy * currentMap.width + cx;
    const oldTile = currentMap.tiles[idx] || { terrain: 'grass', obj: '' };
    let newTile: GridTile = { ...oldTile };

    if (activeTool === 'BRUSH') {
      if (selectedObject) {
        newTile = { ...newTile, obj: selectedObject };
      } else {
        newTile = { ...newTile, terrain: selectedTerrain };
      }
    } else if (activeTool === 'ERASER') {
      if (oldTile.obj) {
        newTile = { ...newTile, obj: '' };
      } else {
        newTile = { ...newTile, terrain: 'grass' };
      }
    } else if (activeTool === 'EYEDROPPER') {
      if (oldTile.obj) {
        setSelectedObject(oldTile.obj);
        setPaletteTab(1);
      } else {
        setSelectedTerrain(oldTile.terrain);
        setSelectedObject('');
        setPaletteTab(0);
      }
      return currentMap;
    }

    if (newTile.terrain === oldTile.terrain && newTile.obj === oldTile.obj) {
      return currentMap;
    }

    // Record mutation for undo
    currentBatchRef.current.push({ index: idx, oldTile, newTile });

    const newTiles = [...currentMap.tiles];
    newTiles[idx] = newTile;
    return { ...currentMap, tiles: newTiles, updatedAt: Date.now() };
  };

  // Apply brush with brush size
  const applyBrushAt = (cx: number, cy: number, currentMap: GridMap): GridMap => {
    let res = currentMap;
    const half = Math.floor(brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        res = mutateCell(cx + dx, cy + dy, res);
      }
    }
    return res;
  };

  // Flood fill algorithm
  const floodFill = (startX: number, startY: number, currentMap: GridMap): GridMap => {
    if (startX < 0 || startX >= currentMap.width || startY < 0 || startY >= currentMap.height) {
      return currentMap;
    }

    const startIdx = startY * currentMap.width + startX;
    const targetTile = currentMap.tiles[startIdx];
    const targetTerrain = targetTile.terrain;

    // If already the same terrain and no object selected, return
    if (!selectedObject && targetTerrain === selectedTerrain) return currentMap;

    const mutations: TileMutation[] = [];
    const newTiles = [...currentMap.tiles];
    const visited = new Uint8Array(currentMap.width * currentMap.height);
    const queue: [number, number][] = [[startX, startY]];
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const idx = y * currentMap.width + x;
      const oldTile = newTiles[idx];

      const newTile: GridTile = selectedObject
        ? { ...oldTile, obj: selectedObject }
        : { ...oldTile, terrain: selectedTerrain };

      mutations.push({ index: idx, oldTile, newTile });
      newTiles[idx] = newTile;

      const neighbors: [number, number][] = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < currentMap.width && ny >= 0 && ny < currentMap.height) {
          const nidx = ny * currentMap.width + nx;
          if (!visited[nidx] && newTiles[nidx].terrain === targetTerrain) {
            visited[nidx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    if (mutations.length > 0) {
      setUndoStack(prev => [...prev.slice(-49), mutations]);
      setRedoStack([]);
      const updated = { ...currentMap, tiles: newTiles, updatedAt: Date.now() };
      updateMapState(updated);
      return updated;
    }
    return currentMap;
  };

  // Undo and Redo handlers
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const batch = undoStack[undoStack.length - 1];
    const newTiles = [...map.tiles];

    for (const m of batch) {
      newTiles[m.index] = m.oldTile;
    }

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, batch]);
    updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const batch = redoStack[redoStack.length - 1];
    const newTiles = [...map.tiles];

    for (const m of batch) {
      newTiles[m.index] = m.newTile;
    }

    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, batch]);
    updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
  };

  // Mouse / Touch Pointer interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPanMode || e.button === 1 || e.button === 2) {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }

    const gridPos = screenToGrid(e.clientX, e.clientY);
    if (!gridPos) return;

    if (activeTool === 'FILL_BUCKET') {
      floodFill(gridPos.x, gridPos.y, map);
      return;
    }

    isInteractingRef.current = true;
    currentBatchRef.current = [];
    lastCellRef.current = gridPos;

    const newMap = applyBrushAt(gridPos.x, gridPos.y, map);
    updateMapState(newMap);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const gridPos = screenToGrid(e.clientX, e.clientY);
    setHoverCoord(gridPos);

    if (isPanningRef.current) {
      setPanOffset({
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y,
      });
      return;
    }

    if (!isInteractingRef.current || !gridPos) return;

    if (lastCellRef.current && lastCellRef.current.x === gridPos.x && lastCellRef.current.y === gridPos.y) {
      return;
    }

    lastCellRef.current = gridPos;
    const newMap = applyBrushAt(gridPos.x, gridPos.y, map);
    updateMapState(newMap);
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
    if (isInteractingRef.current) {
      isInteractingRef.current = false;
      if (currentBatchRef.current.length > 0) {
        setUndoStack(prev => [...prev.slice(-49), currentBatchRef.current]);
        setRedoStack([]);
      }
      currentBatchRef.current = [];
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom(prev => Math.max(0.4, Math.min(4.0, prev * zoomFactor)));
  };

  // Quick Map Operations
  const handleFillAll = () => {
    const mutations: TileMutation[] = [];
    const newTiles = map.tiles.map((t, idx) => {
      const newT: GridTile = { ...t, terrain: selectedTerrain };
      if (t.terrain !== selectedTerrain) {
        mutations.push({ index: idx, oldTile: t, newTile: newT });
      }
      return newT;
    });

    if (mutations.length > 0) {
      setUndoStack(prev => [...prev, mutations]);
      setRedoStack([]);
      updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
    }
    setShowMoreMenu(false);
  };

  const handleClearObjects = () => {
    const mutations: TileMutation[] = [];
    const newTiles = map.tiles.map((t, idx) => {
      if (t.obj) {
        const newT: GridTile = { ...t, obj: '' };
        mutations.push({ index: idx, oldTile: t, newTile: newT });
        return newT;
      }
      return t;
    });

    if (mutations.length > 0) {
      setUndoStack(prev => [...prev, mutations]);
      setRedoStack([]);
      updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
    }
    setShowMoreMenu(false);
  };

  const handleResizeConfirm = (newW: number, newH: number) => {
    const newTiles: GridTile[] = [];
    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        if (x < map.width && y < map.height) {
          newTiles.push(map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' });
        } else {
          newTiles.push({ terrain: 'grass', obj: '' });
        }
      }
    }
    updateMapState({
      ...map,
      width: newW,
      height: newH,
      tiles: newTiles,
      updatedAt: Date.now(),
    });
    setUndoStack([]);
    setRedoStack([]);
  };

  const activeTerrainDef = getTerrain(selectedTerrain);
  const activeObjDef = getMapObject(selectedObject);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-5 shrink-0 z-20">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">
              {worldMapContextId ? 'Back to World' : 'Library'}
            </span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <h1
              onClick={() => setShowRenameModal(true)}
              className="font-bold text-sm sm:text-base text-slate-100 hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-xs"
              title="Click to rename map"
            >
              <span className="truncate">{map.name}</span>
              <Edit className="w-3.5 h-3.5 opacity-50 shrink-0" />
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-slate-400">
              {map.width}×{map.height}
            </span>
          </div>
        </div>

        {/* Center: Undo / Redo & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}
            title="Zoom Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            title="Reset View"
            className="px-1.5 py-0.5 rounded-md text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => setZoom(prev => Math.min(4.0, prev + 0.2))}
            title="Zoom In"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowGrid(prev => !prev)}
            title="Toggle Grid Lines"
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showGrid
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowLegendModal(true)}
            title="Tile & Color Legend"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowResizeModal(true)}
            title="Resize Map Grid"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <Scaling className="w-4 h-4" />
          </button>

          {/* More actions menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(prev => !prev)}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 py-1 text-xs text-slate-200">
                <button
                  onClick={handleFillAll}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                >
                  <PaintBucket className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fill All with Selected</span>
                </button>
                <button
                  onClick={handleClearObjects}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                >
                  <Trash className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clear All Objects</span>
                </button>
                <button
                  onClick={() => {
                    setIsColorOnlyMode(prev => !prev);
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                >
                  <Palette className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isColorOnlyMode ? 'Enable Textures' : 'Flat Colors Only'}</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* Center Canvas Area */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden cursor-crosshair touch-none"
      >
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Floating Pan/Draw mode toggle pill */}
        <div className="absolute top-4 left-4 z-10 flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={() => setIsPanMode(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !isPanMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => setIsPanMode(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isPanMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Pan & Zoom</span>
          </button>
        </div>

        {/* Hover Coordinate info chip */}
        {hoverCoord && hoverCoord.x >= 0 && hoverCoord.x < map.width && hoverCoord.y >= 0 && hoverCoord.y < map.height && (
          <div className="absolute bottom-3 left-4 z-10 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-xs flex items-center gap-2">
            <span>X: {hoverCoord.x}, Y: {hoverCoord.y}</span>
            <span className="text-slate-500">•</span>
            <span>
              {getTerrain(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.terrain).title.split('/')[0]}
            </span>
            {map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj && (
              <>
                <span className="text-slate-500">•</span>
                <span>
                  {getMapObject(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj)?.iconEmoji}{' '}
                  {getMapObject(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj)?.title}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Palette & Tool Controller */}
      <footer className="bg-slate-900 border-t border-slate-800 p-2 sm:p-3 shrink-0 z-20 space-y-2.5 shadow-2xl">
        {/* Row 1: Tools & Brush Size */}
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { tool: 'BRUSH' as EditorTool, icon: Paintbrush, label: 'Brush' },
              { tool: 'FILL_BUCKET' as EditorTool, icon: PaintBucket, label: 'Fill Bucket' },
              { tool: 'ERASER' as EditorTool, icon: Eraser, label: 'Eraser' },
              { tool: 'EYEDROPPER' as EditorTool, icon: Pipette, label: 'Eyedropper' },
            ].map(({ tool, icon: Icon, label }) => {
              const isActive = activeTool === tool;
              return (
                <button
                  key={tool}
                  onClick={() => setActiveTool(tool)}
                  title={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Active selection preview & Brush Size */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400">Painting:</span>
              {selectedObject ? (
                <div className="flex items-center gap-1 text-xs text-slate-200 font-medium">
                  <span className="text-base">{activeObjDef?.iconEmoji}</span>
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{activeObjDef?.title}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-200 font-medium">
                  <div
                    className="w-3.5 h-3.5 rounded-sm border"
                    style={{
                      backgroundColor: activeTerrainDef.baseColor,
                      borderColor: activeTerrainDef.detailColor,
                    }}
                  />
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">
                    {activeTerrainDef.title.split('/')[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[1, 2, 3].map(sz => (
                <button
                  key={sz}
                  onClick={() => setBrushSize(sz)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                    brushSize === sz
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sz}×{sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Category Tabs */}
        <div className="flex items-center gap-2 max-w-7xl mx-auto border-t border-slate-800/60 pt-2">
          <button
            onClick={() => setPaletteTab(0)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              paletteTab === 0
                ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Terrains & Biomes (16)
          </button>
          <button
            onClick={() => setPaletteTab(1)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              paletteTab === 1
                ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Structures & Objects (12)
          </button>
        </div>

        {/* Row 3: Horizontal Carousel of Palette Items */}
        <div className="max-w-7xl mx-auto overflow-x-auto pb-1 scrollbar-thin">
          {paletteTab === 0 ? (
            <div className="flex items-center gap-2 min-w-max">
              {TERRAIN_TYPES.map(terrain => {
                const isSelected = selectedTerrain === terrain.id && !selectedObject;
                return (
                  <button
                    key={terrain.id}
                    onClick={() => {
                      setSelectedTerrain(terrain.id);
                      setSelectedObject('');
                    }}
                    className={`flex flex-col items-center justify-between p-1.5 w-20 h-14 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-7 h-5 rounded-sm border shadow-xs"
                      style={{
                        backgroundColor: terrain.baseColor,
                        borderColor: terrain.detailColor,
                      }}
                    />
                    <span className="text-[10px] truncate w-full text-center">
                      {terrain.title.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-max">
              {MAP_OBJECTS.map(obj => {
                const isSelected = selectedObject === obj.id;
                return (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObject(obj.id)}
                    className={`flex flex-col items-center justify-between p-1.5 w-20 h-14 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl leading-none">{obj.iconEmoji}</span>
                    <span className="text-[10px] truncate w-full text-center">
                      {obj.title.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </footer>

      {/* Modals */}
      {showLegendModal && (
        <TileLegendModal
          map={map}
          isColorOnlyMode={isColorOnlyMode}
          onToggleColorOnlyMode={() => setIsColorOnlyMode(prev => !prev)}
          onSelectTerrain={tid => {
            setSelectedTerrain(tid);
            setSelectedObject('');
            setPaletteTab(0);
          }}
          onClose={() => setShowLegendModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal map={map} onClose={() => setShowExportModal(false)} />
      )}

      {showResizeModal && (
        <ResizeMapModal
          currentWidth={map.width}
          currentHeight={map.height}
          onConfirm={handleResizeConfirm}
          onClose={() => setShowResizeModal(false)}
        />
      )}

      {showRenameModal && (
        <RenameModal
          title="Rename Map"
          initialValue={map.name}
          onConfirm={newName => {
            updateMapState({ ...map, name: newName, updatedAt: Date.now() });
          }}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </div>
  );
};
