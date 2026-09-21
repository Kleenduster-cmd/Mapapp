import { GridTile, GridMap, WorldMap } from '../types';
import { getTerrain, getMapObject } from '../constants/tiles';

export interface RenderOptions {
  cellSize: number;
  showGrid?: boolean;
  colorOnlyMode?: boolean;
  showLabels?: boolean;
  highlightCell?: { x: number; y: number } | null;
  offsetX?: number;
  offsetY?: number;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: GridTile,
  x: number,
  y: number,
  s: number,
  showGrid: boolean = true,
  colorOnlyMode: boolean = false,
  showLabels: boolean = true
) {
  const terrain = getTerrain(tile.terrain);
  const baseColor = terrain.baseColor;
  const detailColor = terrain.detailColor;

  // 1. Base terrain background
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, s, s);

  // 2. Procedural terrain details (skipped in color-only mode or tiny scale)
  if (!colorOnlyMode && s >= 10) {
    drawTerrainDetails(ctx, tile.terrain, x, y, s, detailColor);
  }

  // 3. Map Object if present
  const obj = getMapObject(tile.obj);
  if (obj && s >= 8) {
    drawMapObject(ctx, obj.iconEmoji, x, y, s);
  }

  // 4. Grid border
  if (showGrid && s >= 6) {
    ctx.strokeStyle = colorOnlyMode ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = s > 24 ? 1 : 0.5;
    ctx.strokeRect(x, y, s, s);
  }

  // 5. Tile Label / Name Badge if present
  if (showLabels && tile.label) {
    drawTileLabel(ctx, tile.label, x, y, s);
  }
}

function drawTileLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  s: number
) {
  if (s >= 26) {
    ctx.save();
    const fontSize = Math.max(9, Math.min(11, Math.floor(s * 0.22)));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const paddingX = 4;
    const paddingY = 2;
    const badgeW = Math.min(textWidth + paddingX * 2, s - 4);
    const badgeH = fontSize + paddingY * 2;
    const badgeX = x + (s - badgeW) / 2;
    const badgeY = y + s - badgeH - 2;

    // Dark pill container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    // Text with clip to avoid overflowing
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
    ctx.clip();
    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + s / 2, badgeY + badgeH / 2);
    ctx.restore();

    ctx.restore();
  } else if (s >= 14) {
    // If small, draw a neat prominent indicator tag badge in top right corner
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + s - 3.5, y + 3.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawTerrainDetails(
  ctx: CanvasRenderingContext2D,
  terrainId: string,
  x: number,
  y: number,
  s: number,
  detailColor: string
) {
  ctx.save();
  ctx.fillStyle = detailColor;
  ctx.strokeStyle = detailColor;

  switch (terrainId) {
    case 'deep_water': {
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.2, y + s * 0.35);
      ctx.lineTo(x + s * 0.8, y + s * 0.35);
      ctx.moveTo(x + s * 0.35, y + s * 0.7);
      ctx.lineTo(x + s * 0.65, y + s * 0.7);
      ctx.stroke();
      break;
    }
    case 'shallow_water': {
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + s * 0.4);
      ctx.lineTo(x + s * 0.75, y + s * 0.4);
      ctx.stroke();

      ctx.strokeStyle = detailColor;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.15, y + s * 0.75);
      ctx.lineTo(x + s * 0.55, y + s * 0.75);
      ctx.stroke();
      break;
    }
    case 'forest': {
      // Tree top triangle
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.18);
      ctx.lineTo(x + s * 0.82, y + s * 0.75);
      ctx.lineTo(x + s * 0.18, y + s * 0.75);
      ctx.closePath();
      ctx.fill();

      // Trunk
      ctx.fillStyle = '#4A321E';
      ctx.fillRect(x + s * 0.44, y + s * 0.75, s * 0.12, s * 0.18);
      break;
    }
    case 'mountain': {
      // Mountain peak triangle
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.15);
      ctx.lineTo(x + s * 0.88, y + s * 0.85);
      ctx.lineTo(x + s * 0.12, y + s * 0.85);
      ctx.closePath();
      ctx.fill();

      // Snow cap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.15);
      ctx.lineTo(x + s * 0.65, y + s * 0.4);
      ctx.lineTo(x + s * 0.35, y + s * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'hills': {
      // Rounded hill mound
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, y + s * 0.85);
      ctx.quadraticCurveTo(x + s * 0.5, y + s * 0.25, x + s * 0.9, y + s * 0.85);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'grass': {
      // Gentle blades
      ctx.strokeStyle = detailColor;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.3, y + s * 0.6);
      ctx.lineTo(x + s * 0.35, y + s * 0.35);
      ctx.moveTo(x + s * 0.7, y + s * 0.7);
      ctx.lineTo(x + s * 0.65, y + s * 0.45);
      ctx.stroke();
      break;
    }
    case 'sand': {
      // Dune ripples
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.arc(x + s * 0.5, y + s * 0.45, s * 0.25, Math.PI, 2 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'dirt_path': {
      // Small pebbles
      ctx.beginPath();
      ctx.arc(x + s * 0.35, y + s * 0.4, s * 0.08, 0, Math.PI * 2);
      ctx.arc(x + s * 0.68, y + s * 0.65, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'stone_road': {
      // Cobblestone paver pattern
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.strokeRect(x + s * 0.1, y + s * 0.1, s * 0.38, s * 0.38);
      ctx.strokeRect(x + s * 0.52, y + s * 0.52, s * 0.38, s * 0.38);
      break;
    }
    case 'snow': {
      // Ice sparkle
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.5, y + s * 0.3);
      ctx.lineTo(x + s * 0.5, y + s * 0.7);
      ctx.moveTo(x + s * 0.3, y + s * 0.5);
      ctx.lineTo(x + s * 0.7, y + s * 0.5);
      ctx.stroke();
      break;
    }
    case 'swamp': {
      // Murky pool oval
      ctx.beginPath();
      ctx.ellipse(x + s * 0.5, y + s * 0.55, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lava': {
      // Molten veins
      ctx.strokeStyle = '#FFCC00';
      ctx.lineWidth = Math.max(1, s * 0.09);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.15, y + s * 0.2);
      ctx.lineTo(x + s * 0.5, y + s * 0.45);
      ctx.lineTo(x + s * 0.35, y + s * 0.75);
      ctx.lineTo(x + s * 0.85, y + s * 0.85);
      ctx.stroke();
      break;
    }
    case 'dungeon_wall': {
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.5);
      ctx.lineTo(x + s, y + s * 0.5);
      ctx.moveTo(x + s * 0.5, y);
      ctx.lineTo(x + s * 0.5, y + s * 0.5);
      ctx.moveTo(x + s * 0.25, y + s * 0.5);
      ctx.lineTo(x + s * 0.25, y + s);
      ctx.moveTo(x + s * 0.75, y + s * 0.5);
      ctx.lineTo(x + s * 0.75, y + s);
      ctx.stroke();
      break;
    }
    case 'dungeon_floor': {
      ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.strokeRect(x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9);
      break;
    }
    case 'wood_plank': {
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.33);
      ctx.lineTo(x + s, y + s * 0.33);
      ctx.moveTo(x, y + s * 0.67);
      ctx.lineTo(x + s, y + s * 0.67);
      ctx.stroke();
      break;
    }
    case 'chasm': {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, y + s * 0.1);
      ctx.lineTo(x + s * 0.4, y + s * 0.4);
      ctx.stroke();
      break;
    }
    default: {
      // Procedural detail for custom terrains
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.25, y + s * 0.25);
      ctx.lineTo(x + s * 0.4, y + s * 0.4);
      ctx.moveTo(x + s * 0.6, y + s * 0.6);
      ctx.lineTo(x + s * 0.75, y + s * 0.75);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      break;
    }
  }

  ctx.restore();
}

function drawMapObject(
  ctx: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  s: number
) {
  if (!emoji) return;
  ctx.save();
  const fontSize = Math.floor(s * 0.65);
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x + s * 0.5, y + s * 0.52);
  ctx.restore();
}

export function renderGridMapToCanvas(
  canvas: HTMLCanvasElement,
  map: GridMap,
  options: RenderOptions
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    cellSize,
    showGrid = true,
    colorOnlyMode = false,
    showLabels = true,
    highlightCell,
    offsetX = 0,
    offsetY = 0,
  } = options;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' };
      const drawX = offsetX + x * cellSize;
      const drawY = offsetY + y * cellSize;

      drawTile(ctx, tile, drawX, drawY, cellSize, showGrid, colorOnlyMode, showLabels);
    }
  }

  // Draw outer boundary
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, map.width * cellSize, map.height * cellSize);

  // Draw hover/highlight if active
  if (highlightCell && highlightCell.x >= 0 && highlightCell.x < map.width && highlightCell.y >= 0 && highlightCell.y < map.height) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      offsetX + highlightCell.x * cellSize,
      offsetY + highlightCell.y * cellSize,
      cellSize,
      cellSize
    );
  }
}

export function renderSeamlessWorld(
  ctx: CanvasRenderingContext2D,
  world: WorldMap,
  connectedMaps: Record<number, GridMap>,
  cellSize: number,
  showSectorBorders: boolean = true,
  colorOnlyMode: boolean = false,
  showLabels: boolean = true,
  offsetX: number = 0,
  offsetY: number = 0
) {
  const standardSectorW = 16;
  const standardSectorH = 16;
  const sectorPixelW = standardSectorW * cellSize;
  const sectorPixelH = standardSectorH * cellSize;

  for (let r = 0; r < world.gridRows; r++) {
    for (let c = 0; c < world.gridCols; c++) {
      const mapId = world.slots[`${c}_${r}`];
      const sectorX = offsetX + c * sectorPixelW;
      const sectorY = offsetY + r * sectorPixelH;

      if (mapId && connectedMaps[mapId]) {
        const subMap = connectedMaps[mapId];
        for (let my = 0; my < subMap.height; my++) {
          for (let mx = 0; mx < subMap.width; mx++) {
            const tile = subMap.tiles[my * subMap.width + mx] || { terrain: 'grass', obj: '' };
            const drawX = sectorX + mx * cellSize;
            const drawY = sectorY + my * cellSize;
            drawTile(ctx, tile, drawX, drawY, cellSize, false, colorOnlyMode, showLabels);
          }
        }
      } else {
        // Empty slot background
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(sectorX, sectorY, sectorPixelW, sectorPixelH);

        // Dashed pattern or unmapped indication
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sectorX + 4, sectorY + 4, sectorPixelW - 8, sectorPixelH - 8);

        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Sector (${c + 1}, ${r + 1})`, sectorX + sectorPixelW / 2, sectorY + sectorPixelH / 2);
      }

      // Sector border
      if (showSectorBorders) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(sectorX, sectorY, sectorPixelW, sectorPixelH);
        ctx.setLineDash([]);
      }
    }
  }

  // Outer world frame
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(offsetX, offsetY, world.gridCols * sectorPixelW, world.gridRows * sectorPixelH);
}
