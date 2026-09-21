import { GridMap, WorldMap, GridTile } from '../types';

const MAPS_STORAGE_KEY = 'map_maker_grid_maps_v1';
const WORLDS_STORAGE_KEY = 'map_maker_worlds_v1';

export function getStoredMaps(): GridMap[] {
  try {
    const raw = localStorage.getItem(MAPS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored maps:', e);
    return [];
  }
}

export function saveStoredMaps(maps: GridMap[]) {
  try {
    localStorage.setItem(MAPS_STORAGE_KEY, JSON.stringify(maps));
  } catch (e) {
    console.error('Failed to save maps:', e);
  }
}

export function getStoredWorlds(): WorldMap[] {
  try {
    const raw = localStorage.getItem(WORLDS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse stored worlds:', e);
    return [];
  }
}

export function saveStoredWorlds(worlds: WorldMap[]) {
  try {
    localStorage.setItem(WORLDS_STORAGE_KEY, JSON.stringify(worlds));
  } catch (e) {
    console.error('Failed to save worlds:', e);
  }
}

export function initializeStarterData(): { maps: GridMap[]; worlds: WorldMap[] } {
  const existingMaps = getStoredMaps();
  const existingWorlds = getStoredWorlds();

  if (existingMaps.length > 0 || existingWorlds.length > 0) {
    return { maps: existingMaps, worlds: existingWorlds };
  }

  // Generate Sample 1: Castle Plains (16x16)
  const castleMap = createSampleCastleMap(1);
  // Generate Sample 2: Dragon Spine Pass (16x16)
  const mountainMap = createSampleMountainMap(2);
  // Generate Sample 3: Whispering Forest (16x16)
  const forestMap = createSampleForestMap(3);
  // Generate Sample 4: Azure Coast (16x16)
  const coastMap = createSampleCoastMap(4);

  const initialMaps = [castleMap, mountainMap, forestMap, coastMap];

  const initialWorld: WorldMap = {
    id: 1,
    name: 'Realm of Eldoria',
    gridCols: 3,
    gridRows: 3,
    slots: {
      '0_0': mountainMap.id,
      '1_0': castleMap.id,
      '1_1': forestMap.id,
      '2_1': coastMap.id,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'Connected continent showing northern mountains, royal kingdom plains, ancient forest, and eastern coast.',
  };

  const initialWorlds = [initialWorld];

  saveStoredMaps(initialMaps);
  saveStoredWorlds(initialWorlds);

  return { maps: initialMaps, worlds: initialWorlds };
}

function createSampleCastleMap(id: number): GridMap {
  const w = 16;
  const h = 16;
  const tiles: GridTile[] = Array.from({ length: w * h }, () => ({ terrain: 'grass', obj: '' }));

  // River flowing from top to bottom
  for (let y = 0; y < h; y++) {
    const rx = Math.min(15, Math.max(0, Math.floor(4 + y * 0.25)));
    tiles[y * w + rx] = { terrain: 'deep_water', obj: '' };
    if (rx + 1 < w) tiles[y * w + rx + 1] = { terrain: 'shallow_water', obj: '' };
    if (rx - 1 >= 0) tiles[y * w + rx - 1] = { terrain: 'shallow_water', obj: '' };
  }

  // Stone road through middle
  for (let x = 0; x < w; x++) {
    const idx = 8 * w + x;
    const cur = tiles[idx];
    if (cur.terrain === 'deep_water' || cur.terrain === 'shallow_water') {
      tiles[idx] = { terrain: 'wood_plank', obj: 'bridge' };
    } else {
      tiles[idx] = { terrain: 'stone_road', obj: '' };
    }
  }

  // Castle courtyard at (10, 5)
  tiles[5 * w + 11] = { terrain: 'stone_road', obj: 'castle' };
  tiles[5 * w + 10] = { terrain: 'stone_road', obj: 'tower' };
  tiles[5 * w + 12] = { terrain: 'stone_road', obj: 'tower' };

  // Village houses
  tiles[9 * w + 12] = { terrain: 'grass', obj: 'village' };
  tiles[10 * w + 12] = { terrain: 'grass', obj: 'village' };
  tiles[9 * w + 13] = { terrain: 'grass', obj: 'campfire' };

  // Trees
  const trees = [
    [1, 1], [2, 2], [13, 2], [14, 3], [1, 12], [2, 13]
  ];
  for (const [tx, ty] of trees) {
    tiles[ty * w + tx] = { terrain: 'forest', obj: 'tree' };
  }

  return {
    id,
    name: 'Castle Plains',
    width: w,
    height: h,
    tiles,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'The central province home to the royal stronghold and surrounding farmlands.',
  };
}

function createSampleMountainMap(id: number): GridMap {
  const w = 16;
  const h = 16;
  const tiles: GridTile[] = Array.from({ length: w * h }, () => ({ terrain: 'hills', obj: '' }));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x + y >= 8 && x + y <= 18) {
        tiles[y * w + x] = { terrain: 'mountain', obj: '' };
      }
      if (x + y >= 12 && x + y <= 14) {
        tiles[y * w + x] = { terrain: 'snow', obj: '' };
      }
    }
  }

  // Dirt pass
  for (let i = 0; i < 16; i++) {
    const px = Math.min(15, Math.max(0, 15 - i));
    const py = i;
    tiles[py * w + px] = { terrain: 'dirt_path', obj: '' };
  }

  tiles[7 * w + 8] = { terrain: 'stone_road', obj: 'tower' };
  tiles[12 * w + 3] = { terrain: 'mountain', obj: 'dungeon' };
  tiles[3 * w + 12] = { terrain: 'snow', obj: 'chest' };

  return {
    id,
    name: 'Dragon Spine Pass',
    width: w,
    height: h,
    tiles,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'Treacherous jagged ridges with an ancient watchtower guarding the pass.',
  };
}

function createSampleForestMap(id: number): GridMap {
  const w = 16;
  const h = 16;
  const tiles: GridTile[] = Array.from({ length: w * h }, () => ({ terrain: 'forest', obj: '' }));

  // Dirt trail winding through
  for (let y = 0; y < h; y++) {
    const tx = Math.min(15, Math.max(0, Math.floor(7 + Math.sin(y * 0.5) * 3)));
    tiles[y * w + tx] = { terrain: 'dirt_path', obj: '' };
    if (tx + 1 < w) tiles[y * w + tx + 1] = { terrain: 'grass', obj: '' };
  }

  // Ruins & points of interest
  tiles[4 * w + 3] = { terrain: 'grass', obj: 'ruins' };
  tiles[11 * w + 12] = { terrain: 'grass', obj: 'portal' };
  tiles[8 * w + 7] = { terrain: 'dirt_path', obj: 'campfire' };

  // Swamp corner
  for (let y = 12; y < 16; y++) {
    for (let x = 0; x < 4; x++) {
      tiles[y * w + x] = { terrain: 'swamp', obj: '' };
    }
  }
  tiles[14 * w + 1] = { terrain: 'swamp', obj: 'skull' };

  return {
    id,
    name: 'Whispering Forest',
    width: w,
    height: h,
    tiles,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'Dense ancient woods, winding paths, and hidden ruin shrines.',
  };
}

function createSampleCoastMap(id: number): GridMap {
  const w = 16;
  const h = 16;
  const tiles: GridTile[] = Array.from({ length: w * h }, () => ({ terrain: 'grass', obj: '' }));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const coastX = 8 + Math.floor(y * 0.3);
      if (x === coastX || x === coastX - 1) {
        tiles[y * w + x] = { terrain: 'sand', obj: '' };
      } else if (x > coastX) {
        if (x === coastX + 1 || x === coastX + 2) {
          tiles[y * w + x] = { terrain: 'shallow_water', obj: '' };
        } else {
          tiles[y * w + x] = { terrain: 'deep_water', obj: '' };
        }
      }
    }
  }

  // Harbor and ship
  tiles[7 * w + 13] = { terrain: 'deep_water', obj: 'ship' };
  tiles[7 * w + 10] = { terrain: 'wood_plank', obj: 'bridge' };
  tiles[7 * w + 9] = { terrain: 'sand', obj: 'village' };
  tiles[3 * w + 8] = { terrain: 'sand', obj: 'chest' };

  return {
    id,
    name: 'Azure Coast',
    width: w,
    height: h,
    tiles,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    description: 'Coastal trade route with sandy beaches, ocean waters, and a port harbor.',
  };
}
