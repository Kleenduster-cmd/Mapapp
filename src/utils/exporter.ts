import { GridMap, WorldMap } from '../types';
import { drawTile, renderSeamlessWorld, renderGridMap25D, get25DMetrics } from './canvasRenderer';
import { getTerrain } from '../constants/tiles';

export interface MapExportOptions {
  cellSize: number;
  includeGridLines: boolean;
  includeTitle: boolean;
  includeLegend: boolean;
  colorOnlyMode: boolean;
  includeLabels?: boolean;
  includeElevation?: boolean;
  viewProjection?: '2D' | '2.5D';
}

export interface WorldExportOptions {
  cellSize: number;
  includeGridLines: boolean;
  includeBorders: boolean;
  includeLegend: boolean;
  colorOnlyMode: boolean;
  includeLabels?: boolean;
  includeElevation?: boolean;
}

export async function renderMapToBlob(map: GridMap, options: MapExportOptions): Promise<Blob> {
  const {
    cellSize,
    includeGridLines,
    includeTitle,
    includeLegend,
    colorOnlyMode,
    includeLabels = true,
    includeElevation = false,
    viewProjection = '2D',
  } = options;

  const headerHeight = includeTitle ? 80 : 0;
  const legendHeight = includeLegend ? 90 : 0;

  let width: number;
  let height: number;

  if (viewProjection === '2.5D') {
    const { isoW, isoH, stepH, pedestalH } = get25DMetrics(cellSize);
    width = Math.round((map.width + map.height) * (isoW / 2) + 100);
    const contentH = Math.round((map.width + map.height) * (isoH / 2) + stepH * 7 + pedestalH + 80);
    height = contentH + headerHeight + legendHeight;
  } else {
    width = map.width * cellSize;
    height = map.height * cellSize + headerHeight + legendHeight;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(300, width);
  canvas.height = Math.max(200, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Background
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header Banner
  if (includeTitle) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, canvas.width, headerHeight);

    ctx.fillStyle = '#F8FAFC';
    ctx.font = `bold ${Math.min(24, Math.max(16, canvas.width / 24))}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${map.name} ${viewProjection === '2.5D' ? '(2.5D Isometric)' : ''}`, 20, 30);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${map.width} × ${map.height} Grid Map • ${map.tiles.length} Tiles • Elevation Enabled`, 20, 56);
  }

  // Draw Tiles
  const mapOffsetY = headerHeight;

  if (viewProjection === '2.5D') {
    const { isoW, isoH } = get25DMetrics(cellSize);
    const originX = (canvas.width / 2) + ((map.height - map.width) * (isoW / 4));
    const originY = mapOffsetY + 40;

    renderGridMap25D(ctx, map, {
      cellSize,
      showGrid: includeGridLines,
      colorOnlyMode,
      showLabels: includeLabels,
      showElevation: includeElevation,
      offsetX: originX,
      offsetY: originY,
    });
  } else {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' };
        drawTile(
          ctx,
          tile,
          x * cellSize,
          mapOffsetY + y * cellSize,
          cellSize,
          includeGridLines,
          colorOnlyMode,
          includeLabels,
          includeElevation
        );
      }
    }

    // Draw Map Outer Border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, mapOffsetY, map.width * cellSize, map.height * cellSize);
  }

  // Tile Legend Footer
  if (includeLegend) {
    const legendY = canvas.height - legendHeight;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, legendY, canvas.width, legendHeight);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BIOME & TERRAIN LEGEND', 20, legendY + 24);

    // Group unique terrains present in map
    const terrainCounts = new Map<string, number>();
    for (const t of map.tiles) {
      terrainCounts.set(t.terrain, (terrainCounts.get(t.terrain) || 0) + 1);
    }

    const sortedTerrains = Array.from(terrainCounts.keys()).slice(0, 8);
    let curX = 20;
    const swatchSize = 16;

    for (const tid of sortedTerrains) {
      const terrain = getTerrain(tid);
      ctx.fillStyle = terrain.baseColor;
      ctx.fillRect(curX, legendY + 40, swatchSize, swatchSize);
      ctx.strokeStyle = terrain.detailColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(curX, legendY + 40, swatchSize, swatchSize);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '11px sans-serif';
      const label = terrain.title.split('/')[0].trim();
      ctx.fillText(label, curX + swatchSize + 6, legendY + 52);

      curX += ctx.measureText(label).width + swatchSize + 22;
      if (curX > canvas.width - 100) break;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

export async function renderWorldToBlob(
  world: WorldMap,
  connectedMaps: Record<number, GridMap>,
  options: WorldExportOptions
): Promise<Blob> {
  const {
    cellSize,
    includeBorders,
    includeLegend,
    colorOnlyMode,
    includeLabels = true,
  } = options;

  const standardSectorW = 16;
  const standardSectorH = 16;
  const worldW = world.gridCols * standardSectorW * cellSize;
  const worldH = world.gridRows * standardSectorH * cellSize;
  const headerH = 80;
  const legendH = includeLegend ? 80 : 0;

  const totalW = worldW;
  const totalH = worldH + headerH + legendH;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // Background
  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(0, 0, totalW, totalH);

  // Header
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, totalW, headerH);
  ctx.fillStyle = '#F9FAFB';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(world.name, 24, 30);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '13px sans-serif';
  ctx.fillText(
    `Unified World Atlas • ${world.gridCols}×${world.gridRows} Sectors • ${Object.keys(world.slots).length} Connected Territories`,
    24,
    58
  );

  // Draw Stitched World
  renderSeamlessWorld(
    ctx,
    world,
    connectedMaps,
    cellSize,
    includeBorders,
    colorOnlyMode,
    includeLabels,
    0,
    headerH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    }, 'image/png');
  });
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMapToJsonString(map: GridMap): string {
  const serialized = {
    version: 1,
    name: map.name,
    width: map.width,
    height: map.height,
    description: map.description,
    createdAt: map.createdAt,
    updatedAt: map.updatedAt,
    tiles: map.tiles.map(t => `${t.terrain}|${t.obj || ''}|${t.label || ''}`),
  };
  return JSON.stringify(serialized, null, 2);
}

export function exportWorldToJsonString(world: WorldMap, connectedMaps: Record<number, GridMap>): string {
  const serializedMaps = Object.values(connectedMaps).map(m => JSON.parse(exportMapToJsonString(m)));
  const serialized = {
    version: 1,
    name: world.name,
    gridCols: world.gridCols,
    gridRows: world.gridRows,
    description: world.description,
    createdAt: world.createdAt,
    updatedAt: world.updatedAt,
    slots: world.slots,
    maps: serializedMaps,
  };
  return JSON.stringify(serialized, null, 2);
}

export function parseMapJson(jsonString: string): { map?: GridMap; world?: WorldMap; connectedMaps?: GridMap[]; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data) return { error: 'Invalid JSON format' };

    // Check if it's a World Map bundle
    if (data.gridCols && data.gridRows && data.slots) {
      const world: WorldMap = {
        id: Date.now(),
        name: data.name || 'Imported World',
        gridCols: Number(data.gridCols) || 3,
        gridRows: Number(data.gridRows) || 3,
        slots: data.slots || {},
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
        description: data.description || '',
      };

      const connectedMaps: GridMap[] = [];
      if (Array.isArray(data.maps)) {
        for (const rawMap of data.maps) {
          const map = parseSingleMapObject(rawMap);
          if (map) connectedMaps.push(map);
        }
      }

      return { world, connectedMaps };
    }

    // Otherwise single GridMap
    const map = parseSingleMapObject(data);
    if (map) return { map };

    return { error: 'Unrecognized map or world format' };
  } catch (e: any) {
    return { error: e.message || 'Failed to parse JSON file' };
  }
}

function parseSingleMapObject(data: any): GridMap | null {
  if (!data || typeof data.width !== 'number' || typeof data.height !== 'number') return null;

  const w = data.width;
  const h = data.height;
  const rawTiles = Array.isArray(data.tiles) ? data.tiles : [];
  const total = w * h;

  const tiles = Array.from({ length: total }, (_, i) => {
    const entry = rawTiles[i];
    if (typeof entry === 'string') {
      const parts = entry.split('|');
      return {
        terrain: parts[0] || 'grass',
        obj: parts[1] || '',
        label: parts[2] || undefined,
      };
    }
    return { terrain: 'grass', obj: '' };
  });

  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: data.name || 'Imported Map',
    width: w,
    height: h,
    tiles,
    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
    description: data.description || '',
  };
}
