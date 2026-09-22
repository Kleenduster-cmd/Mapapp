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
  Tag,
  Plus,
  Sparkles,
  Mountain,
  Box,
  Layers,
  ChevronsUp,
  ChevronsDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  GridMap,
  EditorTool,
  GridTile,
  TileMutation,
  TerrainDef,
  MapObjectDef,
  ViewProjection,
  ElevationMode,
} from '../types';
import {
  TERRAIN_TYPES,
  MAP_OBJECTS,
  getTerrain,
  getMapObject,
  registerCustomTerrain,
  registerCustomObject,
} from '../constants/tiles';
import {
  drawTile,
  renderGridMap25D,
  get25DMetrics,
  isoScreenToGrid,
} from '../utils/canvasRenderer';
import {
  getStoredCustomTerrains,
  saveStoredCustomTerrains,
  getStoredCustomObjects,
  saveStoredCustomObjects,
} from '../utils/storage';
import { TileLegendModal } from '../components/TileLegendModal';
import { ExportModal } from '../components/ExportModal';
import { ResizeMapModal } from '../components/ResizeMapModal';
import { RenameModal } from '../components/RenameModal';
import { NameTileModal } from '../components/NameTileModal';
import { AddCustomTileModal } from '../components/AddCustomTileModal';
import { ThreeTopDownCanvas } from '../components/ThreeTopDownCanvas';

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
  const [paletteTab, setPaletteTab] = useState<0 | 1 | 2>(0); // 0: Terrains, 1: Objects, 2: Elevation presets

  // View Projection: '2.5D' (Three.js Top-Down 2.5D with 3D elevation blocks) or '2D' (flat Top-Down canvas)
  const [viewProjection, setViewProjection] = useState<ViewProjection>('2.5D');
  const [elevationMode, setElevationMode] = useState<ElevationMode>('RAISE');
  const [targetElevation, setTargetElevation] = useState<number>(1);
  const [showElevation, setShowElevation] = useState<boolean>(true);

  // Canvas View state
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showIsoGrid, setShowIsoGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isColorOnlyMode, setIsColorOnlyMode] = useState<boolean>(false);

  // Custom tiles and objects
  const [customTerrains, setCustomTerrains] = useState<TerrainDef[]>(() => getStoredCustomTerrains());
  const [customObjects, setCustomObjects] = useState<MapObjectDef[]>(() => getStoredCustomObjects());

  // Naming & Custom Tile modals
  const [namingTileTarget, setNamingTileTarget] = useState<{
    x: number;
    y: number;
    tile: GridTile;
  } | null>(null);
  const [showAddCustomTileModal, setShowAddCustomTileModal] = useState<boolean>(false);
  const [addCustomTileInitialTab, setAddCustomTileInitialTab] = useState<'terrain' | 'object'>('terrain');

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

    // 2.5D Isometric Rendering
    if (viewProjection === '2.5D') {
      const { isoW, isoH } = get25DMetrics(effectiveCellSize);
      const originX = (width / 2) + ((map.height - map.width) * (isoW / 4)) + panOffset.x;
      const originY = (height / 2) - ((map.width + map.height) * (isoH / 4)) + panOffset.y;

      renderGridMap25D(ctx, map, {
        cellSize: effectiveCellSize,
        showGrid: showIsoGrid,
        colorOnlyMode: isColorOnlyMode,
        showLabels,
        showElevation: showElevation || activeTool === 'ELEVATION',
        highlightCell: isPanMode ? null : hoverCoord,
        offsetX: originX,
        offsetY: originY,
      });
      return;
    }

    // 2D Top-Down Rendering
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
        drawTile(
          ctx,
          tile,
          drawX,
          drawY,
          effectiveCellSize,
          showGrid,
          isColorOnlyMode,
          showLabels,
          showElevation || activeTool === 'ELEVATION'
        );
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
  }, [
    baseCellSize,
    isColorOnlyMode,
    isPanMode,
    map,
    panOffset,
    showGrid,
    showIsoGrid,
    showLabels,
    showElevation,
    viewProjection,
    activeTool,
    zoom,
    hoverCoord,
  ]);

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

    if (viewProjection === '2.5D') {
      const { isoW, isoH } = get25DMetrics(effectiveCellSize);
      const originX = (rect.width / 2) + ((map.height - map.width) * (isoW / 4)) + panOffset.x;
      const originY = (rect.height / 2) - ((map.width + map.height) * (isoH / 4)) + panOffset.y;
      return isoScreenToGrid(localX, localY, map, originX, originY, effectiveCellSize);
    }

    const mapPixelW = map.width * effectiveCellSize;
    const mapPixelH = map.height * effectiveCellSize;

    const centerOffsetX = (rect.width - mapPixelW) / 2;
    const centerOffsetY = (rect.height - mapPixelH) / 2;

    const totalOffsetX = centerOffsetX + panOffset.x;
    const totalOffsetY = centerOffsetY + panOffset.y;

    const cellX = Math.floor((localX - totalOffsetX) / effectiveCellSize);
    const cellY = Math.floor((localY - totalOffsetY) / effectiveCellSize);

    if (cellX < 0 || cellX >= map.width || cellY < 0 || cellY >= map.height) return null;
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
    } else if (activeTool === 'ELEVATION') {
      const curElev = oldTile.elevation ?? 0;
      let nextElev = curElev;
      if (elevationMode === 'RAISE') {
        nextElev = Math.min(6, curElev + 1);
      } else if (elevationMode === 'LOWER') {
        nextElev = Math.max(-3, curElev - 1);
      } else if (elevationMode === 'SET') {
        nextElev = targetElevation;
      } else if (elevationMode === 'FLATTEN') {
        nextElev = 0;
      }
      newTile = { ...newTile, elevation: nextElev };
    }

    if (
      newTile.terrain === oldTile.terrain &&
      newTile.obj === oldTile.obj &&
      (newTile.elevation ?? 0) === (oldTile.elevation ?? 0)
    ) {
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
    const targetElev = targetTile.elevation ?? 0;
    const isElevationFill = activeTool === 'ELEVATION';

    // If already the same terrain or elevation, return
    if (!isElevationFill && !selectedObject && targetTerrain === selectedTerrain) return currentMap;
    if (isElevationFill && elevationMode === 'SET' && targetElev === targetElevation) return currentMap;
    if (isElevationFill && elevationMode === 'FLATTEN' && targetElev === 0) return currentMap;

    const mutations: TileMutation[] = [];
    const newTiles = [...currentMap.tiles];
    const visited = new Uint8Array(currentMap.width * currentMap.height);
    const queue: [number, number][] = [[startX, startY]];
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const idx = y * currentMap.width + x;
      const oldTile = newTiles[idx];

      let newTile: GridTile;
      if (isElevationFill) {
        let nextElev = targetElev;
        if (elevationMode === 'RAISE') nextElev = Math.min(6, (oldTile.elevation ?? 0) + 1);
        else if (elevationMode === 'LOWER') nextElev = Math.max(-3, (oldTile.elevation ?? 0) - 1);
        else if (elevationMode === 'SET') nextElev = targetElevation;
        else if (elevationMode === 'FLATTEN') nextElev = 0;
        newTile = { ...oldTile, elevation: nextElev };
      } else {
        newTile = selectedObject
          ? { ...oldTile, obj: selectedObject }
          : { ...oldTile, terrain: selectedTerrain };
      }

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
          if (!visited[nidx]) {
            const matches = isElevationFill
              ? (newTiles[nidx].elevation ?? 0) === targetElev
              : newTiles[nidx].terrain === targetTerrain;
            if (matches) {
              visited[nidx] = 1;
              queue.push([nx, ny]);
            }
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

  // Center pan view on specific tile coordinate
  const focusOnTile = (x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const effectiveCellSize = baseCellSize * zoom;
    const mapPixelW = map.width * effectiveCellSize;
    const mapPixelH = map.height * effectiveCellSize;
    const centerOffsetX = (width - mapPixelW) / 2;
    const centerOffsetY = (height - mapPixelH) / 2;

    const tileCenterX = centerOffsetX + (x + 0.5) * effectiveCellSize;
    const tileCenterY = centerOffsetY + (y + 0.5) * effectiveCellSize;

    setPanOffset({
      x: width / 2 - tileCenterX,
      y: height / 2 - tileCenterY,
    });
  };

  // Save tile name from modal
  const handleSaveTileName = (label: string) => {
    if (!namingTileTarget) return;
    const { x, y } = namingTileTarget;
    const idx = y * map.width + x;
    const oldTile = map.tiles[idx] || { terrain: 'grass', obj: '' };
    const newTile: GridTile = { ...oldTile, label: label || undefined };

    const mutation: TileMutation = { index: idx, oldTile, newTile };
    setUndoStack(prev => [...prev.slice(-49), [mutation]]);
    setRedoStack([]);

    const newTiles = [...map.tiles];
    newTiles[idx] = newTile;
    updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
    setNamingTileTarget(null);
  };

  // Custom tiles registration
  const handleAddCustomTerrain = (newTerrain: TerrainDef) => {
    registerCustomTerrain(newTerrain);
    const updated = [...customTerrains, newTerrain];
    setCustomTerrains(updated);
    saveStoredCustomTerrains(updated);
    setSelectedTerrain(newTerrain.id);
    setSelectedObject('');
    setPaletteTab(0);
  };

  const handleAddCustomObject = (newObject: MapObjectDef) => {
    registerCustomObject(newObject);
    const updated = [...customObjects, newObject];
    setCustomObjects(updated);
    saveStoredCustomObjects(updated);
    setSelectedObject(newObject.id);
    setPaletteTab(1);
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

    if (activeTool === 'LABEL') {
      const idx = gridPos.y * map.width + gridPos.x;
      const tile = map.tiles[idx] || { terrain: 'grass', obj: '' };
      setNamingTileTarget({ x: gridPos.x, y: gridPos.y, tile });
      return;
    }

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

  // Handlers for ThreeTopDownCanvas interactions
  const handleThreeTilePointerDown = (x: number, y: number) => {
    if (activeTool === 'LABEL') {
      const idx = y * map.width + x;
      const tile = map.tiles[idx] || { terrain: 'grass', obj: '' };
      setNamingTileTarget({ x, y, tile });
      return;
    }

    if (activeTool === 'FILL_BUCKET') {
      floodFill(x, y, map);
      return;
    }

    isInteractingRef.current = true;
    currentBatchRef.current = [];
    lastCellRef.current = { x, y };

    const newMap = applyBrushAt(x, y, map);
    updateMapState(newMap);
  };

  const handleThreeTilePointerMove = (x: number, y: number) => {
    if (!isInteractingRef.current) return;
    if (lastCellRef.current && lastCellRef.current.x === x && lastCellRef.current.y === y) {
      return;
    }

    lastCellRef.current = { x, y };
    const newMap = applyBrushAt(x, y, map);
    updateMapState(newMap);
  };

  const handleThreeTilePointerUp = () => {
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

  const handleFlattenAllElevation = () => {
    const mutations: TileMutation[] = [];
    const newTiles = map.tiles.map((t, idx) => {
      if ((t.elevation ?? 0) !== 0) {
        const newT: GridTile = { ...t, elevation: 0 };
        mutations.push({ index: idx, oldTile: t, newTile: newT });
        return newT;
      }
      return t;
    });

    if (mutations.length > 0) {
      setUndoStack(prev => [...prev.slice(-49), mutations]);
      setRedoStack([]);
      updateMapState({ ...map, tiles: newTiles, updatedAt: Date.now() });
    }
    setShowMoreMenu(false);
  };

  const handleGenerateRollingHills = () => {
    const mutations: TileMutation[] = [];
    const newTiles = map.tiles.map((t, idx) => {
      const x = idx % map.width;
      const y = Math.floor(idx / map.width);
      const wave1 = Math.sin((x / map.width) * Math.PI * 2) * Math.cos((y / map.height) * Math.PI * 2);
      const wave2 = Math.sin(x / 3 + y / 2) * 0.7;
      const elev = Math.round(wave1 * 2 + wave2);
      const clamped = Math.max(-1, Math.min(4, elev));

      if ((t.elevation ?? 0) !== clamped) {
        const newT: GridTile = { ...t, elevation: clamped };
        mutations.push({ index: idx, oldTile: t, newTile: newT });
        return newT;
      }
      return t;
    });

    if (mutations.length > 0) {
      setUndoStack(prev => [...prev.slice(-49), mutations]);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setViewProjection(prev => (prev === '2D' ? '2.5D' : '2D'));
      } else if (e.key === 'g' || e.key === 'G') {
        if (viewProjection === '2.5D') {
          setShowIsoGrid(prev => !prev);
        } else {
          setShowGrid(prev => !prev);
        }
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('ELEVATION');
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('BRUSH');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('ERASER');
      } else if (e.key === 'f' || e.key === 'F') {
        setActiveTool('FILL_BUCKET');
      } else if (e.key === 'i' || e.key === 'I') {
        setActiveTool('EYEDROPPER');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('LABEL');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
          {/* Top-Down / 2.5D Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner mr-1">
            <button
              id="view-threejs-btn"
              onClick={() => setViewProjection('2.5D')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewProjection === '2.5D'
                  ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2.5D Top-Down View with Three.js (Hotkey: V)"
            >
              <Box className="w-3.5 h-3.5 text-sky-300" />
              <span>2.5D Three.js</span>
            </button>
            <button
              id="view-top-down-btn"
              onClick={() => setViewProjection('2D')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewProjection === '2D'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="2D Top-Down View (Hotkey: V)"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>2D Top-Down</span>
            </button>
          </div>

          <button
            onClick={() => setShowElevation(prev => !prev)}
            title={showElevation ? 'Hide Elevation Badges (H)' : 'Show Elevation Badges (H)'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showElevation || activeTool === 'ELEVATION'
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Mountain className="w-4 h-4" />
          </button>

          {/* Grid Lines Toggle Button */}
          <button
            id="toggle-grid-btn"
            onClick={() => {
              if (viewProjection === '2.5D') {
                setShowIsoGrid(prev => !prev);
              } else {
                setShowGrid(prev => !prev);
              }
            }}
            title={(viewProjection === '2.5D' ? showIsoGrid : showGrid) ? 'Hide Grid Lines (G)' : 'Show Grid Lines (G)'}
            className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              (viewProjection === '2.5D' ? showIsoGrid : showGrid)
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-[11px] font-medium hidden lg:inline">
              {(viewProjection === '2.5D' ? showIsoGrid : showGrid) ? 'Grid On' : 'Grid Off'}
            </span>
          </button>

          <button
            onClick={() => setShowLabels(prev => !prev)}
            title={showLabels ? 'Hide Tile Name Badges' : 'Show Tile Name Badges'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              showLabels
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
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
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 py-1 text-xs text-slate-200">
                <button
                  onClick={handleFillAll}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                >
                  <PaintBucket className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fill All with Selected</span>
                </button>
                <button
                  onClick={handleGenerateRollingHills}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-emerald-300"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generate Rolling Hills</span>
                </button>
                <button
                  onClick={handleFlattenAllElevation}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-amber-300"
                >
                  <Minus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Flatten All Elevation to 0</span>
                </button>
                <button
                  onClick={handleClearObjects}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left"
                >
                  <Trash className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clear All Objects</span>
                </button>
                <button
                  id="menu-toggle-grid-btn"
                  onClick={() => {
                    if (viewProjection === '2.5D') {
                      setShowIsoGrid(prev => !prev);
                    } else {
                      setShowGrid(prev => !prev);
                    }
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left text-slate-300"
                >
                  <Grid className="w-3.5 h-3.5 text-slate-400" />
                  <span>{(viewProjection === '2.5D' ? showIsoGrid : showGrid) ? 'Hide Grid Lines' : 'Show Grid Lines'}</span>
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
      <div className="flex-1 relative overflow-hidden select-none w-full h-full">
        {viewProjection === '2.5D' ? (
          <ThreeTopDownCanvas
            map={map}
            activeTool={activeTool}
            elevationMode={elevationMode}
            targetElevation={targetElevation}
            selectedTerrain={selectedTerrain}
            selectedObject={selectedObject}
            brushSize={brushSize}
            showGrid={showGrid}
            showElevation={showElevation}
            showLabels={showLabels}
            isColorOnlyMode={isColorOnlyMode}
            isPanMode={isPanMode}
            hoverCoord={hoverCoord}
            onTilePointerDown={handleThreeTilePointerDown}
            onTilePointerMove={handleThreeTilePointerMove}
            onTilePointerUp={handleThreeTilePointerUp}
            onHoverCoordChange={setHoverCoord}
            onContextMenuTile={(x, y) => {
              const idx = y * map.width + x;
              const tile = map.tiles[idx] || { terrain: 'grass', obj: '' };
              setNamingTileTarget({ x, y, tile });
            }}
            onToggleGrid={() => setShowGrid(prev => !prev)}
            onToggleElevation={() => setShowElevation(prev => !prev)}
          />
        ) : (
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onContextMenu={e => {
              e.preventDefault();
              const gridPos = screenToGrid(e.clientX, e.clientY);
              if (
                gridPos &&
                gridPos.x >= 0 &&
                gridPos.x < map.width &&
                gridPos.y >= 0 &&
                gridPos.y < map.height
              ) {
                const idx = gridPos.y * map.width + gridPos.x;
                const tile = map.tiles[idx] || { terrain: 'grass', obj: '' };
                setNamingTileTarget({ x: gridPos.x, y: gridPos.y, tile });
              }
            }}
            className="w-full h-full relative overflow-hidden cursor-crosshair touch-none"
          >
            <canvas ref={canvasRef} className="absolute inset-0" />
          </div>
        )}

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
          <div className="absolute bottom-3 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md backdrop-blur-xs flex items-center gap-2">
            <span>X: {hoverCoord.x}, Y: {hoverCoord.y}</span>
            <span className="text-slate-500">•</span>
            <span>
              {getTerrain(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.terrain).title.split('/')[0]}
            </span>
            {(() => {
              const curTile = map.tiles[hoverCoord.y * map.width + hoverCoord.x];
              const curElev = curTile?.elevation ?? 0;
              return (
                <>
                  <span className="text-slate-500">•</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      curElev > 0
                        ? 'text-emerald-400'
                        : curElev < 0
                        ? 'text-sky-400'
                        : 'text-slate-400'
                    }`}
                  >
                    <Mountain className="w-3 h-3" />
                    Elev: {curElev > 0 ? `+${curElev}` : curElev}
                  </span>
                </>
              );
            })()}
            {map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj && (
              <>
                <span className="text-slate-500">•</span>
                <span>
                  {getMapObject(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj)?.iconEmoji}{' '}
                  {getMapObject(map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.obj)?.title}
                </span>
              </>
            )}
            {map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.label && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  "{map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.label}"
                </span>
              </>
            )}
            <button
              onClick={() => {
                const idx = hoverCoord.y * map.width + hoverCoord.x;
                const tile = map.tiles[idx] || { terrain: 'grass', obj: '' };
                setNamingTileTarget({ x: hoverCoord.x, y: hoverCoord.y, tile });
              }}
              title="Name this tile"
              className="ml-1 text-[10px] text-indigo-400 hover:text-indigo-300 underline font-sans"
            >
              {map.tiles[hoverCoord.y * map.width + hoverCoord.x]?.label ? 'Edit Name' : 'Name Tile'}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Palette & Tool Controller */}
      <footer className="bg-slate-900 border-t border-slate-800 p-2 sm:p-3 shrink-0 z-20 space-y-2.5 shadow-2xl">
        {/* Row 1: Tools & Brush Size */}
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto flex-wrap">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {[
              { tool: 'BRUSH' as EditorTool, icon: Paintbrush, label: 'Brush (B)' },
              { tool: 'ELEVATION' as EditorTool, icon: Mountain, label: 'Elevation (H)' },
              { tool: 'FILL_BUCKET' as EditorTool, icon: PaintBucket, label: 'Fill Bucket (F)' },
              { tool: 'ERASER' as EditorTool, icon: Eraser, label: 'Eraser (E)' },
              { tool: 'EYEDROPPER' as EditorTool, icon: Pipette, label: 'Eyedropper (I)' },
              { tool: 'LABEL' as EditorTool, icon: Tag, label: 'Name Tile (L)' },
            ].map(({ tool, icon: Icon, label }) => {
              const isActive = activeTool === tool;
              return (
                <button
                  key={tool}
                  onClick={() => setActiveTool(tool)}
                  title={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? tool === 'ELEVATION'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                        : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active selection preview & Brush Size */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[11px] text-slate-400">
                {activeTool === 'ELEVATION' ? 'Elevation:' : 'Painting:'}
              </span>
              {activeTool === 'ELEVATION' ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <Mountain className="w-3.5 h-3.5" />
                  <span>
                    {elevationMode === 'RAISE'
                      ? 'Raise (+1)'
                      : elevationMode === 'LOWER'
                      ? 'Lower (-1)'
                      : elevationMode === 'SET'
                      ? `Set (${targetElevation > 0 ? '+' : ''}${targetElevation})`
                      : 'Flatten (0)'}
                  </span>
                </div>
              ) : selectedObject ? (
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

        {/* Dedicated Elevation Sculpt Controls when ELEVATION tool is active */}
        {activeTool === 'ELEVATION' && (
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2 shadow-lg animate-in fade-in duration-200">
            {/* Mode selection buttons */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Mode:</span>
              {(
                [
                  { mode: 'RAISE' as ElevationMode, icon: ChevronsUp, label: 'Raise (+1)' },
                  { mode: 'LOWER' as ElevationMode, icon: ChevronsDown, label: 'Lower (-1)' },
                  {
                    mode: 'SET' as ElevationMode,
                    icon: Mountain,
                    label: `Set (${targetElevation > 0 ? '+' : ''}${targetElevation})`,
                  },
                  { mode: 'FLATTEN' as ElevationMode, icon: Minus, label: 'Flatten (0)' },
                ] as const
              ).map(({ mode, icon: ModeIcon, label }) => (
                <button
                  key={mode}
                  onClick={() => setElevationMode(mode)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    elevationMode === mode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ModeIcon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Quick target elevation selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400">Target Height:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {[-2, -1, 0, 1, 2, 3, 4, 5, 6].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setTargetElevation(lvl);
                      setElevationMode('SET');
                    }}
                    className={`w-7 h-6 rounded-md text-xs font-mono font-bold transition-all ${
                      targetElevation === lvl && elevationMode === 'SET'
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                        : lvl === 0
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : lvl > 0
                        ? 'text-emerald-400 hover:bg-slate-800'
                        : 'text-sky-400 hover:bg-slate-800'
                    }`}
                    title={
                      lvl < 0
                        ? `Sunken / Trench (${lvl})`
                        : lvl === 0
                        ? 'Ground Level (0)'
                        : `Elevation (+${lvl})`
                    }
                  >
                    {lvl > 0 ? `+${lvl}` : lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick generators */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateRollingHills}
                title="Procedurally generate natural rolling hills"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Rolling Hills</span>
              </button>
              <button
                onClick={handleFlattenAllElevation}
                title="Reset all tiles to 0 ground level"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-xs font-semibold transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Flatten All</span>
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Category Tabs */}
        <div className="flex items-center justify-between max-w-7xl mx-auto border-t border-slate-800/60 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteTab(0)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                paletteTab === 0
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Terrains & Biomes ({TERRAIN_TYPES.length + customTerrains.length})
            </button>
            <button
              onClick={() => setPaletteTab(1)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                paletteTab === 1
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Structures & Objects ({MAP_OBJECTS.length + customObjects.length})
            </button>
            <button
              onClick={() => {
                setPaletteTab(2);
                setActiveTool('ELEVATION');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                paletteTab === 2
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              <span>Elevation & Topography</span>
            </button>
          </div>

          <button
            onClick={() => {
              setAddCustomTileInitialTab(paletteTab === 0 ? 'terrain' : 'object');
              setShowAddCustomTileModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add & Name Tile</span>
          </button>
        </div>

        {/* Row 3: Horizontal Carousel of Palette Items */}
        <div className="max-w-7xl mx-auto overflow-x-auto pb-1 scrollbar-thin">
          {paletteTab === 0 ? (
            <div className="flex items-center gap-2 min-w-max">
              {/* Add Custom Terrain Tile card */}
              <button
                onClick={() => {
                  setAddCustomTileInitialTab('terrain');
                  setShowAddCustomTileModal(true);
                }}
                title="Create and Name a New Custom Terrain Tile"
                className="flex flex-col items-center justify-center p-1.5 w-20 h-14 rounded-lg border border-dashed border-indigo-500/60 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 transition-all shrink-0"
              >
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-bold">+ New Tile</span>
              </button>

              {[...TERRAIN_TYPES, ...customTerrains].map(terrain => {
                const isSelected = selectedTerrain === terrain.id && !selectedObject && activeTool !== 'ELEVATION';
                return (
                  <button
                    key={terrain.id}
                    onClick={() => {
                      setSelectedTerrain(terrain.id);
                      setSelectedObject('');
                      if (activeTool === 'ELEVATION') setActiveTool('BRUSH');
                    }}
                    className={`flex flex-col items-center justify-between p-1.5 w-20 h-14 rounded-lg border transition-all relative ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {terrain.isCustom && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400" />
                    )}
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
          ) : paletteTab === 1 ? (
            <div className="flex items-center gap-2 min-w-max">
              {/* Add Custom Object Marker card */}
              <button
                onClick={() => {
                  setAddCustomTileInitialTab('object');
                  setShowAddCustomTileModal(true);
                }}
                title="Create and Name a New Custom Object Marker"
                className="flex flex-col items-center justify-center p-1.5 w-20 h-14 rounded-lg border border-dashed border-indigo-500/60 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 transition-all shrink-0"
              >
                <Plus className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-bold">+ Marker</span>
              </button>

              {[...MAP_OBJECTS, ...customObjects].map(obj => {
                const isSelected = selectedObject === obj.id && activeTool !== 'ELEVATION';
                return (
                  <button
                    key={obj.id}
                    onClick={() => {
                      setSelectedObject(obj.id);
                      if (activeTool === 'ELEVATION') setActiveTool('BRUSH');
                    }}
                    className={`flex flex-col items-center justify-between p-1.5 w-20 h-14 rounded-lg border transition-all relative ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/30 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {obj.isCustom && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400" />
                    )}
                    <span className="text-xl leading-none">{obj.iconEmoji}</span>
                    <span className="text-[10px] truncate w-full text-center">
                      {obj.title.split('/')[0].trim()}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Elevation & Topography Presets */
            <div className="flex items-center gap-2 min-w-max">
              {[
                { level: -2, name: 'Deep Abyss', desc: 'Chasm / Trench', color: '#1e1b4b', border: '#4338ca', icon: '⚓' },
                { level: -1, name: 'Sunken Bed', desc: 'Depression / Lake', color: '#0f3b46', border: '#14b8a6', icon: '🌊' },
                { level: 0, name: 'Ground Plains', desc: 'Ground Level (0)', color: '#1e293b', border: '#475569', icon: '🌱' },
                { level: 1, name: 'Low Hills', desc: 'Gentle Slope (+1)', color: '#14532d', border: '#22c55e', icon: '🌿' },
                { level: 2, name: 'High Plateau', desc: 'Raised Mesa (+2)', color: '#713f12', border: '#eab308', icon: '⛰️' },
                { level: 3, name: 'Mountain Ridge', desc: 'Highlands (+3)', color: '#78350f', border: '#f97316', icon: '🏔️' },
                { level: 4, name: 'High Peaks', desc: 'Crest (+4)', color: '#581c87', border: '#a855f7', icon: '🗻' },
                { level: 5, name: 'Alpine Summit', desc: 'Glacier Crest (+5)', color: '#1e3a8a', border: '#38bdf8', icon: '❄️' },
                { level: 6, name: 'Sky Pinnacle', desc: 'Mythic Height (+6)', color: '#4c1d95', border: '#c084fc', icon: '⚡' },
              ].map(preset => {
                const isSelected = activeTool === 'ELEVATION' && elevationMode === 'SET' && targetElevation === preset.level;
                return (
                  <button
                    key={preset.level}
                    onClick={() => {
                      setActiveTool('ELEVATION');
                      setElevationMode('SET');
                      setTargetElevation(preset.level);
                    }}
                    className={`flex flex-col items-center justify-between p-1.5 w-24 h-14 rounded-lg border transition-all relative ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40 font-semibold'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{preset.icon}</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {preset.level > 0 ? `+${preset.level}` : preset.level}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium truncate w-full text-center text-slate-300">
                      {preset.name}
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
          onFocusTile={(x, y) => focusOnTile(x, y)}
          onClose={() => setShowLegendModal(false)}
        />
      )}

      {/* Name / Label Tile Modal */}
      {namingTileTarget && (
        <NameTileModal
          coord={{ x: namingTileTarget.x, y: namingTileTarget.y }}
          tile={namingTileTarget.tile}
          onSave={handleSaveTileName}
          onClose={() => setNamingTileTarget(null)}
        />
      )}

      {/* Add Custom Tile / Object Modal */}
      {showAddCustomTileModal && (
        <AddCustomTileModal
          initialTab={addCustomTileInitialTab}
          onAddTerrain={handleAddCustomTerrain}
          onAddObject={handleAddCustomObject}
          onClose={() => setShowAddCustomTileModal(false)}
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
