import React, { useState, useEffect, useRef } from 'react';
import {
  Map,
  Globe,
  Plus,
  Search,
  Upload,
  MoreVertical,
  Edit2,
  Copy,
  Download,
  Trash2,
  Layers,
  Calendar,
  Compass,
} from 'lucide-react';
import { GridMap, WorldMap } from '../types';
import { renderGridMapToCanvas, renderSeamlessWorld } from '../utils/canvasRenderer';

interface LibraryViewProps {
  maps: GridMap[];
  worlds: WorldMap[];
  onOpenMap: (mapId: number) => void;
  onOpenWorld: (worldId: number) => void;
  onCreateMapClick: () => void;
  onCreateWorldClick: () => void;
  onImportClick: () => void;
  onRenameMap: (map: GridMap) => void;
  onRenameWorld: (world: WorldMap) => void;
  onDuplicateMap: (map: GridMap) => void;
  onDuplicateWorld: (world: WorldMap) => void;
  onExportMap: (map: GridMap) => void;
  onExportWorld: (world: WorldMap) => void;
  onDeleteMap: (mapId: number) => void;
  onDeleteWorld: (worldId: number) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  maps,
  worlds,
  onOpenMap,
  onOpenWorld,
  onCreateMapClick,
  onCreateWorldClick,
  onImportClick,
  onRenameMap,
  onRenameWorld,
  onDuplicateMap,
  onDuplicateWorld,
  onExportMap,
  onExportWorld,
  onDeleteMap,
  onDeleteWorld,
}) => {
  const [activeTab, setActiveTab] = useState<'maps' | 'worlds'>('maps');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const filteredMaps = maps.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorlds = worlds.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapLookup = React.useMemo(() => {
    const dict: Record<number, GridMap> = {};
    for (const m of maps) dict[m.id] = m;
    return dict;
  }, [maps]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top App Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-xl">
              🗺️
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                Map Maker
              </h1>
              <p className="text-xs text-slate-400">Grid Maps & World Builder</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onImportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>

            {activeTab === 'maps' ? (
              <button
                onClick={onCreateMapClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>New Map</span>
              </button>
            ) : (
              <button
                onClick={onCreateWorldClick}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" />
                <span>New World</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => setActiveTab('maps')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'maps'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Grid Maps ({maps.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('worlds')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'worlds'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>World Maps ({worlds.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={activeTab === 'maps' ? 'Search local maps...' : 'Search world maps...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content Section */}
        {activeTab === 'maps' ? (
          <div>
            {filteredMaps.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
                  🗺️
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-300">No maps found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? 'No maps match your search query.'
                      : 'Get started by creating your first tactical encounter map or dungeon!'}
                  </p>
                </div>
                <button
                  onClick={onCreateMapClick}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Map</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMaps.map(map => (
                  <MapCard
                    key={map.id}
                    map={map}
                    isMenuOpen={activeMenuId === `map_${map.id}`}
                    onToggleMenu={e => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === `map_${map.id}` ? null : `map_${map.id}`);
                    }}
                    onOpen={() => onOpenMap(map.id)}
                    onRename={() => onRenameMap(map)}
                    onDuplicate={() => onDuplicateMap(map)}
                    onExport={() => onExportMap(map)}
                    onDelete={() => onDeleteMap(map.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredWorlds.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl">
                  🌍
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-300">No worlds created</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    {searchQuery
                      ? 'No world maps match your search query.'
                      : 'World maps let you stitch multiple grid maps into cohesive kingdoms, regions, or continents.'}
                  </p>
                </div>
                <button
                  onClick={onCreateWorldClick}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create World Map</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filteredWorlds.map(world => (
                  <WorldCard
                    key={world.id}
                    world={world}
                    connectedMaps={mapLookup}
                    isMenuOpen={activeMenuId === `world_${world.id}`}
                    onToggleMenu={e => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === `world_${world.id}` ? null : `world_${world.id}`);
                    }}
                    onOpen={() => onOpenWorld(world.id)}
                    onRename={() => onRenameWorld(world)}
                    onDuplicate={() => onDuplicateWorld(world)}
                    onExport={() => onExportWorld(world)}
                    onDelete={() => onDeleteWorld(world.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

interface MapCardProps {
  map: GridMap;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const MapCard: React.FC<MapCardProps> = ({
  map,
  isMenuOpen,
  onToggleMenu,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const maxDim = Math.max(map.width, map.height);
    const cellSize = Math.floor(180 / maxDim);
    canvas.width = map.width * cellSize;
    canvas.height = map.height * cellSize;

    renderGridMapToCanvas(canvas, map, {
      cellSize,
      showGrid: true,
      colorOnlyMode: false,
    });
  }, [map]);

  const dateStr = new Date(map.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      onClick={onOpen}
      className="group relative bg-slate-900 border border-slate-800/90 hover:border-emerald-500/60 rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-emerald-950/20 cursor-pointer flex flex-col"
    >
      {/* Thumbnail canvas */}
      <div className="w-full h-40 bg-slate-950 flex items-center justify-center p-3 overflow-hidden border-b border-slate-800/80 group-hover:bg-slate-950/80 transition-colors">
        <canvas
          ref={canvasRef}
          className="rounded-sm shadow-md transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Info Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
              {map.name}
            </h3>

            {/* Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={onToggleMenu}
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 py-1 text-xs text-slate-200">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRename();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onExport();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export</span>
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
            {map.description || 'Tactical grid encounter map'}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center gap-1 font-mono">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>{map.width}×{map.height}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface WorldCardProps {
  world: WorldMap;
  connectedMaps: Record<number, GridMap>;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const WorldCard: React.FC<WorldCardProps> = ({
  world,
  connectedMaps,
  isMenuOpen,
  onToggleMenu,
  onOpen,
  onRename,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotsCount = Object.keys(world.slots).length;

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const standardSectorW = 16;
    const standardSectorH = 16;
    const cellSize = 3;
    const w = world.gridCols * standardSectorW * cellSize;
    const h = world.gridRows * standardSectorH * cellSize;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderSeamlessWorld(ctx, world, connectedMaps, cellSize, true, false, 0, 0);
  }, [world, connectedMaps]);

  return (
    <div
      onClick={onOpen}
      className="group relative bg-slate-900 border border-slate-800/90 hover:border-indigo-500/60 rounded-xl overflow-hidden shadow-lg transition-all hover:shadow-indigo-950/20 cursor-pointer flex flex-col"
    >
      {/* World Preview */}
      <div className="w-full h-44 bg-slate-950 flex items-center justify-center p-3 overflow-hidden border-b border-slate-800/80 group-hover:bg-slate-950/80 transition-colors">
        <canvas
          ref={canvasRef}
          className="rounded-sm shadow-md transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
              {world.name}
            </h3>

            {/* Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={onToggleMenu}
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 py-1 text-xs text-slate-200">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRename();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDuplicate();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onExport();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 text-left"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export</span>
                  </button>
                  <div className="border-t border-slate-700 my-1" />
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
            {world.description || 'Unified world continent map'}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-4 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center gap-1 text-indigo-400 font-medium">
            <Compass className="w-3 h-3" />
            <span>{world.gridCols}×{world.gridRows} World Atlas</span>
          </div>
          <div>
            <span className="text-slate-300 font-semibold">{slotsCount}</span>
            <span className="text-slate-500"> / {world.gridCols * world.gridRows} sectors linked</span>
          </div>
        </div>
      </div>
    </div>
  );
};
