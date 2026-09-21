export interface TerrainDef {
  id: string;
  title: string;
  baseColor: string;
  detailColor: string;
  category: 'Natural' | 'Water' | 'Path' | 'Hazard' | 'Dungeon' | 'Structure' | 'Custom';
  isCustom?: boolean;
}

export interface MapObjectDef {
  id: string;
  title: string;
  iconEmoji: string;
  color: string;
  isCustom?: boolean;
}

export interface GridTile {
  terrain: string; // terrain id
  obj: string;     // object id or empty/none
  label?: string;  // custom name/label for the tile
}

export interface GridMap {
  id: number;
  name: string;
  width: number;
  height: number;
  tiles: GridTile[];
  createdAt: number;
  updatedAt: number;
  description: string;
}

export interface WorldMap {
  id: number;
  name: string;
  gridCols: number;
  gridRows: number;
  slots: Record<string, number>; // "col_row" -> mapId
  createdAt: number;
  updatedAt: number;
  description: string;
}

export type EditorTool = 'BRUSH' | 'FILL_BUCKET' | 'ERASER' | 'EYEDROPPER' | 'LABEL';

export interface TileMutation {
  index: number;
  oldTile: GridTile;
  newTile: GridTile;
}

export type ActiveScreen = 
  | { type: 'LIBRARY' }
  | { type: 'MAP_EDITOR'; mapId: number; worldMapContextId?: number }
  | { type: 'WORLD_MAP'; worldMapId: number };
