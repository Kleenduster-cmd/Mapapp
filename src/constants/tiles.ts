import { TerrainDef, MapObjectDef } from '../types';

export const TERRAIN_TYPES: TerrainDef[] = [
  { id: 'grass', title: 'Plains / Grass', baseColor: '#5B9E4D', detailColor: '#49833D', category: 'Natural' },
  { id: 'forest', title: 'Dense Forest', baseColor: '#2D6930', detailColor: '#1E4921', category: 'Natural' },
  { id: 'mountain', title: 'Mountain Peak', baseColor: '#6D7987', detailColor: '#4A5563', category: 'Natural' },
  { id: 'hills', title: 'Rolling Hills', baseColor: '#7CA655', detailColor: '#5F853C', category: 'Natural' },
  { id: 'deep_water', title: 'Ocean / Deep Water', baseColor: '#23558A', detailColor: '#19406B', category: 'Water' },
  { id: 'shallow_water', title: 'Coast / River', baseColor: '#4AA5D8', detailColor: '#358AB8', category: 'Water' },
  { id: 'sand', title: 'Desert / Beach', baseColor: '#E0C179', detailColor: '#C9A658', category: 'Natural' },
  { id: 'dirt_path', title: 'Dirt Road / Path', baseColor: '#9E774A', detailColor: '#7A5832', category: 'Path' },
  { id: 'stone_road', title: 'Cobblestone / Road', baseColor: '#8A8F98', detailColor: '#686C74', category: 'Path' },
  { id: 'snow', title: 'Snow / Tundra', baseColor: '#DFEAF2', detailColor: '#B9CFDF', category: 'Natural' },
  { id: 'swamp', title: 'Swamp / Marsh', baseColor: '#485E40', detailColor: '#35462E', category: 'Natural' },
  { id: 'lava', title: 'Molten Lava', baseColor: '#D4421E', detailColor: '#8F1E05', category: 'Hazard' },
  { id: 'dungeon_floor', title: 'Dungeon Floor', baseColor: '#3A3F47', detailColor: '#2A2D33', category: 'Dungeon' },
  { id: 'dungeon_wall', title: 'Dungeon Wall', baseColor: '#1E2126', detailColor: '#131518', category: 'Dungeon' },
  { id: 'wood_plank', title: 'Wood Deck', baseColor: '#8B5A2B', detailColor: '#66411E', category: 'Structure' },
  { id: 'chasm', title: 'Void / Chasm', baseColor: '#0D1117', detailColor: '#000000', category: 'Hazard' },
];

export const TERRAIN_MAP = new Map<string, TerrainDef>(
  TERRAIN_TYPES.map(t => [t.id, t])
);

export function getTerrain(id?: string): TerrainDef {
  if (!id) return TERRAIN_TYPES[0];
  return TERRAIN_MAP.get(id.toLowerCase()) || TERRAIN_TYPES[0];
}

export const MAP_OBJECTS: MapObjectDef[] = [
  { id: 'castle', title: 'Castle / Keep', iconEmoji: '🏰', color: '#E5E9F0' },
  { id: 'village', title: 'Town / Village', iconEmoji: '🏘️', color: '#EBCB8B' },
  { id: 'tower', title: 'Watchtower', iconEmoji: '🗼', color: '#88C0D0' },
  { id: 'dungeon', title: 'Dungeon Entrance', iconEmoji: '🚪', color: '#B48EAD' },
  { id: 'bridge', title: 'Bridge', iconEmoji: '🌉', color: '#D08770' },
  { id: 'chest', title: 'Treasure Chest', iconEmoji: '🪙', color: '#EBCB8B' },
  { id: 'campfire', title: 'Camp / Tavern', iconEmoji: '🔥', color: '#BF616A' },
  { id: 'portal', title: 'Mystic Portal', iconEmoji: '🌀', color: '#B48EAD' },
  { id: 'skull', title: 'Hazard / Boss', iconEmoji: '💀', color: '#ECEFF4' },
  { id: 'ruins', title: 'Ancient Ruins', iconEmoji: '🏛️', color: '#D8DEE9' },
  { id: 'tree', title: 'Single Tree', iconEmoji: '🌲', color: '#A3BE8C' },
  { id: 'ship', title: 'Ship / Harbor', iconEmoji: '⛵', color: '#81A1C1' },
];

export const OBJECT_MAP = new Map<string, MapObjectDef>(
  MAP_OBJECTS.map(o => [o.id, o])
);

export function getMapObject(id?: string): MapObjectDef | null {
  if (!id || id === 'none') return null;
  return OBJECT_MAP.get(id.toLowerCase()) || null;
}
