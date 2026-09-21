import React, { useState, useEffect } from 'react';
import { GridMap, WorldMap, ActiveScreen } from './types';
import {
  initializeStarterData,
  saveStoredMaps,
  saveStoredWorlds,
} from './utils/storage';
import { LibraryView } from './views/LibraryView';
import { EditorView } from './views/EditorView';
import { WorldView } from './views/WorldView';
import { CreateMapModal } from './components/CreateMapModal';
import { CreateWorldModal } from './components/CreateWorldModal';
import { ImportModal } from './components/ImportModal';
import { RenameModal } from './components/RenameModal';
import { ExportModal } from './components/ExportModal';

export const App: React.FC = () => {
  const [maps, setMaps] = useState<GridMap[]>([]);
  const [worlds, setWorlds] = useState<WorldMap[]>([]);
  const [screen, setScreen] = useState<ActiveScreen>({ type: 'LIBRARY' });

  // Modals on library level
  const [showCreateMapModal, setShowCreateMapModal] = useState(false);
  const [showCreateWorldModal, setShowCreateWorldModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingSlotForWorld, setEditingSlotForWorld] = useState<{ worldId: number; slotKey: string } | null>(null);

  const [renameTarget, setRenameTarget] = useState<{ type: 'map' | 'world'; id: number; name: string } | null>(null);
  const [exportTarget, setExportTarget] = useState<{ type: 'map' | 'world'; id: number } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const { maps: initMaps, worlds: initWorlds } = initializeStarterData();
    setMaps(initMaps);
    setWorlds(initWorlds);
  }, []);

  // Persist maps whenever updated
  const updateMapsList = (updater: (prev: GridMap[]) => GridMap[]) => {
    setMaps(prev => {
      const next = updater(prev);
      saveStoredMaps(next);
      return next;
    });
  };

  // Persist worlds whenever updated
  const updateWorldsList = (updater: (prev: WorldMap[]) => WorldMap[]) => {
    setWorlds(prev => {
      const next = updater(prev);
      saveStoredWorlds(next);
      return next;
    });
  };

  // Map CRUD operations
  const handleSaveMap = (updatedMap: GridMap) => {
    updateMapsList(prev => prev.map(m => (m.id === updatedMap.id ? updatedMap : m)));
  };

  const handleCreateMapConfirm = (
    name: string,
    width: number,
    height: number,
    initialTerrain: string,
    description: string
  ) => {
    const newMap: GridMap = {
      id: Date.now(),
      name,
      width,
      height,
      tiles: Array.from({ length: width * height }, () => ({
        terrain: initialTerrain,
        obj: '',
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description,
    };

    updateMapsList(prev => [newMap, ...prev]);

    // If created specifically to link to a world slot
    if (editingSlotForWorld) {
      const { worldId, slotKey } = editingSlotForWorld;
      updateWorldsList(prev =>
        prev.map(w => {
          if (w.id === worldId) {
            return {
              ...w,
              slots: { ...w.slots, [slotKey]: newMap.id },
              updatedAt: Date.now(),
            };
          }
          return w;
        })
      );
      setEditingSlotForWorld(null);
      setScreen({ type: 'MAP_EDITOR', mapId: newMap.id, worldMapContextId: worldId });
    } else {
      setScreen({ type: 'MAP_EDITOR', mapId: newMap.id });
    }
  };

  const handleDuplicateMap = (sourceMap: GridMap) => {
    const duplicated: GridMap = {
      ...sourceMap,
      id: Date.now(),
      name: `${sourceMap.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateMapsList(prev => [duplicated, ...prev]);
  };

  const handleDeleteMap = (mapId: number) => {
    if (confirm('Are you sure you want to delete this map?')) {
      updateMapsList(prev => prev.filter(m => m.id !== mapId));
      // Also unlink from all worlds
      updateWorldsList(prev =>
        prev.map(w => {
          const newSlots = { ...w.slots };
          for (const [key, mid] of Object.entries(newSlots)) {
            if (mid === mapId) delete newSlots[key];
          }
          return { ...w, slots: newSlots, updatedAt: Date.now() };
        })
      );
    }
  };

  // World CRUD operations
  const handleSaveWorld = (updatedWorld: WorldMap) => {
    updateWorldsList(prev => prev.map(w => (w.id === updatedWorld.id ? updatedWorld : w)));
  };

  const handleCreateWorldConfirm = (
    name: string,
    gridCols: number,
    gridRows: number,
    description: string
  ) => {
    const newWorld: WorldMap = {
      id: Date.now(),
      name,
      gridCols,
      gridRows,
      slots: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      description,
    };
    updateWorldsList(prev => [newWorld, ...prev]);
    setScreen({ type: 'WORLD_MAP', worldMapId: newWorld.id });
  };

  const handleDuplicateWorld = (sourceWorld: WorldMap) => {
    const duplicated: WorldMap = {
      ...sourceWorld,
      id: Date.now(),
      name: `${sourceWorld.name} (Copy)`,
      slots: { ...sourceWorld.slots },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateWorldsList(prev => [duplicated, ...prev]);
  };

  const handleDeleteWorld = (worldId: number) => {
    if (confirm('Are you sure you want to delete this world map?')) {
      updateWorldsList(prev => prev.filter(w => w.id !== worldId));
    }
  };

  // Import handler
  const handleImportSuccess = (imported: {
    map?: GridMap;
    world?: WorldMap;
    connectedMaps?: GridMap[];
  }) => {
    if (imported.map) {
      updateMapsList(prev => [imported.map!, ...prev]);
      setScreen({ type: 'MAP_EDITOR', mapId: imported.map.id });
    } else if (imported.world) {
      if (imported.connectedMaps && imported.connectedMaps.length > 0) {
        updateMapsList(prev => [...imported.connectedMaps!, ...prev]);
      }
      updateWorldsList(prev => [imported.world!, ...prev]);
      setScreen({ type: 'WORLD_MAP', worldMapId: imported.world.id });
    }
  };

  // Rendering screen
  const currentMap = screen.type === 'MAP_EDITOR' ? maps.find(m => m.id === screen.mapId) : null;
  const currentWorld = screen.type === 'WORLD_MAP' ? worlds.find(w => w.id === screen.worldMapId) : null;

  const mapLookup = React.useMemo(() => {
    const dict: Record<number, GridMap> = {};
    for (const m of maps) dict[m.id] = m;
    return dict;
  }, [maps]);

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100">
      {screen.type === 'LIBRARY' && (
        <LibraryView
          maps={maps}
          worlds={worlds}
          onOpenMap={mapId => setScreen({ type: 'MAP_EDITOR', mapId })}
          onOpenWorld={worldId => setScreen({ type: 'WORLD_MAP', worldMapId: worldId })}
          onCreateMapClick={() => {
            setEditingSlotForWorld(null);
            setShowCreateMapModal(true);
          }}
          onCreateWorldClick={() => setShowCreateWorldModal(true)}
          onImportClick={() => setShowImportModal(true)}
          onRenameMap={m => setRenameTarget({ type: 'map', id: m.id, name: m.name })}
          onRenameWorld={w => setRenameTarget({ type: 'world', id: w.id, name: w.name })}
          onDuplicateMap={handleDuplicateMap}
          onDuplicateWorld={handleDuplicateWorld}
          onExportMap={m => setExportTarget({ type: 'map', id: m.id })}
          onExportWorld={w => setExportTarget({ type: 'world', id: w.id })}
          onDeleteMap={handleDeleteMap}
          onDeleteWorld={handleDeleteWorld}
        />
      )}

      {screen.type === 'MAP_EDITOR' && currentMap && (
        <EditorView
          key={currentMap.id}
          initialMap={currentMap}
          worldMapContextId={screen.worldMapContextId}
          onSaveMap={handleSaveMap}
          onBack={() => {
            if (screen.worldMapContextId) {
              setScreen({ type: 'WORLD_MAP', worldMapId: screen.worldMapContextId });
            } else {
              setScreen({ type: 'LIBRARY' });
            }
          }}
        />
      )}

      {screen.type === 'WORLD_MAP' && currentWorld && (
        <WorldView
          key={currentWorld.id}
          world={currentWorld}
          availableMaps={maps}
          onSaveWorld={handleSaveWorld}
          onOpenMapEditor={(mapId, worldContextId) =>
            setScreen({ type: 'MAP_EDITOR', mapId, worldMapContextId: worldContextId })
          }
          onCreateAndLinkMap={slotKey => {
            setEditingSlotForWorld({ worldId: currentWorld.id, slotKey });
            setShowCreateMapModal(true);
          }}
          onBack={() => setScreen({ type: 'LIBRARY' })}
        />
      )}

      {/* Common Modals */}
      {showCreateMapModal && (
        <CreateMapModal
          onConfirm={handleCreateMapConfirm}
          onClose={() => {
            setShowCreateMapModal(false);
            setEditingSlotForWorld(null);
          }}
        />
      )}

      {showCreateWorldModal && (
        <CreateWorldModal
          onConfirm={handleCreateWorldConfirm}
          onClose={() => setShowCreateWorldModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onImportSuccess={handleImportSuccess}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {renameTarget && (
        <RenameModal
          title={renameTarget.type === 'map' ? 'Rename Map' : 'Rename World'}
          initialValue={renameTarget.name}
          onConfirm={newName => {
            if (renameTarget.type === 'map') {
              updateMapsList(prev =>
                prev.map(m => (m.id === renameTarget.id ? { ...m, name: newName, updatedAt: Date.now() } : m))
              );
            } else {
              updateWorldsList(prev =>
                prev.map(w => (w.id === renameTarget.id ? { ...w, name: newName, updatedAt: Date.now() } : w))
              );
            }
          }}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {exportTarget && (
        <ExportModal
          map={exportTarget.type === 'map' ? maps.find(m => m.id === exportTarget.id) : undefined}
          worldMap={exportTarget.type === 'world' ? worlds.find(w => w.id === exportTarget.id) : undefined}
          connectedMaps={mapLookup}
          onClose={() => setExportTarget(null)}
        />
      )}
    </div>
  );
};
