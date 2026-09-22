import { GridTile, GridMap, WorldMap } from '../types';
import { getTerrain, getMapObject } from '../constants/tiles';

export interface RenderOptions {
  cellSize: number;
  showGrid?: boolean;
  colorOnlyMode?: boolean;
  showLabels?: boolean;
  showElevation?: boolean;
  viewProjection?: '2D' | '2.5D';
  elevationToolActive?: boolean;
  highlightCell?: { x: number; y: number } | null;
  offsetX?: number;
  offsetY?: number;
}

export function adjustBrightness(hex: string, percent: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: GridTile,
  x: number,
  y: number,
  s: number,
  showGrid: boolean = true,
  colorOnlyMode: boolean = false,
  showLabels: boolean = true,
  showElevation: boolean = false
) {
  const terrain = getTerrain(tile.terrain);
  const elev = tile.elevation ?? 0;
  
  // Modulate base color slightly by elevation in 2D mode for quick visual depth
  let baseColor = terrain.baseColor;
  if (elev > 0) {
    baseColor = adjustBrightness(baseColor, Math.min(24, elev * 4));
  } else if (elev < 0) {
    baseColor = adjustBrightness(baseColor, Math.max(-28, elev * 7));
  }
  const detailColor = terrain.detailColor;

  // 1. Base terrain background
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, s, s);

  // 2. Elevation 2D shading (cliff edge shadows & bevels)
  if (elev !== 0 && s >= 12) {
    if (elev > 0) {
      // High ground: top and left highlight bevel
      const bevelAlpha = Math.min(0.45, 0.12 + elev * 0.06);
      ctx.fillStyle = `rgba(255, 255, 255, ${bevelAlpha})`;
      ctx.fillRect(x, y, s, Math.max(1, Math.round(s * 0.08)));
      ctx.fillRect(x, y, Math.max(1, Math.round(s * 0.08)), s);

      // Bottom and right cliff shadow
      const shadowAlpha = Math.min(0.55, 0.16 + elev * 0.08);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      const shadowH = Math.max(1, Math.round(s * 0.1));
      ctx.fillRect(x, y + s - shadowH, s, shadowH);
      ctx.fillRect(x + s - shadowH, y, shadowH, s);
    } else {
      // Sunken ground: top and left inset shadow
      const insetAlpha = Math.min(0.5, 0.18 + Math.abs(elev) * 0.1);
      ctx.fillStyle = `rgba(0, 0, 0, ${insetAlpha})`;
      const insetH = Math.max(1, Math.round(s * 0.12));
      ctx.fillRect(x, y, s, insetH);
      ctx.fillRect(x, y, insetH, s);

      // Subtle bottom right rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(x, y + s - 1, s, 1);
      ctx.fillRect(x + s - 1, y, 1, s);
    }
  }

  // 3. Procedural terrain details (skipped in color-only mode or tiny scale)
  if (!colorOnlyMode && s >= 10) {
    drawTerrainDetails(ctx, tile.terrain, x, y, s, detailColor);
  }

  // 4. Map Object if present
  const obj = getMapObject(tile.obj);
  if (obj && s >= 8) {
    drawMapObject(ctx, obj.iconEmoji, x, y, s);
  }

  // 5. Grid border
  if (showGrid && s >= 6) {
    ctx.strokeStyle = colorOnlyMode ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.18)';
    ctx.lineWidth = s > 24 ? 1 : 0.5;
    ctx.strokeRect(x, y, s, s);
  }

  // 6. Elevation badge (if enabled)
  if (showElevation && s >= 18) {
    drawElevationBadge2D(ctx, elev, x, y, s);
  }

  // 7. Tile Label / Name Badge if present
  if (showLabels && tile.label) {
    drawTileLabel(ctx, tile.label, x, y, s);
  }
}

function drawElevationBadge2D(
  ctx: CanvasRenderingContext2D,
  elev: number,
  x: number,
  y: number,
  s: number
) {
  ctx.save();
  const fontSize = Math.max(8, Math.min(10, Math.floor(s * 0.24)));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
  
  const text = elev > 0 ? `▲+${elev}` : elev < 0 ? `▼${elev}` : `0`;
  const textW = ctx.measureText(text).width;
  const badgeW = textW + 4;
  const badgeH = fontSize + 3;
  const badgeX = x + 2;
  const badgeY = y + 2;

  // Background tint based on elevation
  if (elev > 0) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)'; // emerald
  } else if (elev < 0) {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.9)'; // sky
  } else {
    ctx.fillStyle = 'rgba(51, 65, 85, 0.75)'; // slate
  }

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, badgeX + badgeW / 2, badgeY + badgeH / 2);
  ctx.restore();
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

export function get25DMetrics(cellSize: number) {
  const isoW = Math.max(24, Math.round(cellSize * 1.8));
  const isoH = Math.round(isoW * 0.5); // standard 2:1 isometric ratio
  const stepH = Math.max(4, Math.round(isoH * 0.45)); // elevation step height
  const pedestalH = Math.max(6, Math.round(isoH * 0.35)); // base foundation slab thickness
  return { isoW, isoH, stepH, pedestalH };
}

export function isoScreenToGrid(
  mouseX: number,
  mouseY: number,
  map: GridMap,
  originX: number,
  originY: number,
  cellSize: number
): { x: number; y: number } | null {
  const { isoW, isoH, stepH } = get25DMetrics(cellSize);

  // 1. Check elevated top diamonds in reverse draw order (front to back)
  const candidates: { x: number; y: number; sum: number; elev: number }[] = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y * map.width + x];
      const elev = tile?.elevation ?? 0;
      candidates.push({ x, y, sum: x + y, elev });
    }
  }

  // Sort descending by (sum + elev * 0.4) so foreground and elevated tiles are tested first
  candidates.sort((a, b) => (b.sum + b.elev * 0.4) - (a.sum + a.elev * 0.4));

  for (const c of candidates) {
    const tile = map.tiles[c.y * map.width + c.x];
    const elev = tile?.elevation ?? 0;
    const tileIsoX = originX + (c.x - c.y) * (isoW / 2);
    const tileIsoY = originY + (c.x + c.y) * (isoH / 2) - elev * stepH;

    const diamondCenterX = tileIsoX;
    const diamondCenterY = tileIsoY + isoH / 2;

    const dx = Math.abs(mouseX - diamondCenterX) / (isoW / 2);
    const dy = Math.abs(mouseY - diamondCenterY) / (isoH / 2);

    if (dx + dy <= 1.0) {
      return { x: c.x, y: c.y };
    }
  }

  // 2. If no top diamond matched directly (e.g. cursor is on side wall or floor), project onto base grid plane (elevation = 0)
  const relX = mouseX - originX;
  const relY = mouseY - originY;
  const invX = (relX / (isoW / 2) + relY / (isoH / 2)) / 2;
  const invY = (relY / (isoH / 2) - relX / (isoW / 2)) / 2;

  const gx = Math.floor(invX);
  const gy = Math.floor(invY);

  if (gx >= 0 && gx < map.width && gy >= 0 && gy < map.height) {
    return { x: gx, y: gy };
  }

  return null;
}

function drawElevationBadge25D(
  ctx: CanvasRenderingContext2D,
  elev: number,
  centerX: number,
  centerY: number,
  isoW: number
) {
  ctx.save();
  const fontSize = Math.max(8, Math.min(10, Math.floor(isoW * 0.13)));
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;

  const text = elev > 0 ? `▲+${elev}` : elev < 0 ? `▼${elev}` : `0`;
  const textW = ctx.measureText(text).width;
  const badgeW = textW + 4;
  const badgeH = fontSize + 3;
  const badgeX = centerX - badgeW / 2;
  const badgeY = centerY - badgeH / 2;

  if (elev > 0) {
    ctx.fillStyle = 'rgba(16, 185, 129, 0.95)'; // emerald
  } else if (elev < 0) {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.95)'; // sky
  } else {
    ctx.fillStyle = 'rgba(51, 65, 85, 0.85)'; // slate
  }

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 3);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, centerX, centerY);
  ctx.restore();
}

export function drawTile25D(
  ctx: CanvasRenderingContext2D,
  tile: GridTile,
  gridX: number,
  gridY: number,
  originX: number,
  originY: number,
  cellSize: number,
  showGrid: boolean = true,
  colorOnlyMode: boolean = false,
  showLabels: boolean = true,
  showElevation: boolean = false,
  isHovered: boolean = false
) {
  const terrain = getTerrain(tile.terrain);
  const elev = tile.elevation ?? 0;
  const { isoW, isoH, stepH, pedestalH } = get25DMetrics(cellSize);

  const topX = originX + (gridX - gridY) * (isoW / 2);
  const topY = originY + (gridX + gridY) * (isoH / 2) - elev * stepH;

  // Calculate cliff drop depth
  const wallDrop = pedestalH + Math.max(0, elev) * stepH + (elev < 0 ? Math.max(3, (elev + 4) * (stepH * 0.25)) : 0);

  const baseColor = terrain.baseColor;

  // 1. Left Wall (in shadow, facing south-west)
  ctx.beginPath();
  ctx.moveTo(topX - isoW / 2, topY + isoH / 2);
  ctx.lineTo(topX, topY + isoH);
  ctx.lineTo(topX, topY + isoH + wallDrop);
  ctx.lineTo(topX - isoW / 2, topY + isoH / 2 + wallDrop);
  ctx.closePath();

  ctx.fillStyle = adjustBrightness(baseColor, -36);
  ctx.fill();

  // Subtle left wall vertical rock strata texture
  if (wallDrop > 12 && !colorOnlyMode) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(topX - isoW * 0.25, topY + isoH * 0.75);
    ctx.lineTo(topX - isoW * 0.25, topY + isoH * 0.75 + wallDrop);
    ctx.stroke();
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }

  // 2. Right Wall (medium light, facing south-east)
  ctx.beginPath();
  ctx.moveTo(topX, topY + isoH);
  ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
  ctx.lineTo(topX + isoW / 2, topY + isoH / 2 + wallDrop);
  ctx.lineTo(topX, topY + isoH + wallDrop);
  ctx.closePath();

  ctx.fillStyle = adjustBrightness(baseColor, -18);
  ctx.fill();

  if (wallDrop > 12 && !colorOnlyMode) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(topX + isoW * 0.25, topY + isoH * 0.75);
    ctx.lineTo(topX + isoW * 0.25, topY + isoH * 0.75 + wallDrop);
    ctx.stroke();
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }

  // 3. Top Diamond Face
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
  ctx.lineTo(topX, topY + isoH);
  ctx.lineTo(topX - isoW / 2, topY + isoH / 2);
  ctx.closePath();

  let topColor = baseColor;
  if (elev > 0) {
    topColor = adjustBrightness(baseColor, Math.min(22, elev * 3.5));
  } else if (elev < 0) {
    topColor = adjustBrightness(baseColor, Math.max(-25, elev * 6));
  }
  ctx.fillStyle = topColor;
  ctx.fill();

  // Top sunlit highlight rim on north facets (Left -> Top -> Right)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(topX - isoW / 2, topY + isoH / 2);
  ctx.lineTo(topX, topY);
  ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
  ctx.stroke();

  // Diamond Grid Border
  if (showGrid) {
    ctx.strokeStyle = colorOnlyMode ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.16)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
    ctx.lineTo(topX, topY + isoH);
    ctx.lineTo(topX - isoW / 2, topY + isoH / 2);
    ctx.closePath();
    ctx.stroke();
  }

  // 4. Procedural terrain details clipped to diamond
  if (!colorOnlyMode && isoW >= 18) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
    ctx.lineTo(topX, topY + isoH);
    ctx.lineTo(topX - isoW / 2, topY + isoH / 2);
    ctx.closePath();
    ctx.clip();

    drawTerrainDetails(
      ctx,
      tile.terrain,
      topX - isoW * 0.25,
      topY + isoH * 0.1,
      isoW * 0.5,
      terrain.detailColor
    );
    ctx.restore();
  }

  // 5. Standing Map Object
  const obj = getMapObject(tile.obj);
  if (obj && isoW >= 14) {
    // Soft drop shadow ellipse on top face
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(topX, topY + isoH * 0.58, isoW * 0.18, isoH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Standing emoji icon
    drawMapObject(ctx, obj.iconEmoji, topX - isoW * 0.25, topY - isoH * 0.32, isoW * 0.5);
  }

  // 6. Elevation badge
  if (showElevation && isoW >= 20) {
    drawElevationBadge25D(ctx, elev, topX, topY + isoH * 0.38, isoW);
  }

  // 7. Tile Label badge
  if (showLabels && tile.label) {
    drawTileLabel(ctx, tile.label, topX - isoW * 0.35, topY - isoH * 0.15, isoW * 0.7);
  }

  // 8. Hover Highlight
  if (isHovered) {
    ctx.save();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(topX + isoW / 2, topY + isoH / 2);
    ctx.lineTo(topX, topY + isoH);
    ctx.lineTo(topX - isoW / 2, topY + isoH / 2);
    ctx.closePath();
    ctx.stroke();

    // Outline the wall bottom corners
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topX - isoW / 2, topY + isoH / 2 + wallDrop);
    ctx.lineTo(topX, topY + isoH + wallDrop);
    ctx.lineTo(topX + isoW / 2, topY + isoH / 2 + wallDrop);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderGridMap25D(
  ctx: CanvasRenderingContext2D,
  map: GridMap,
  options: RenderOptions
) {
  const {
    cellSize,
    showGrid = true,
    colorOnlyMode = false,
    showLabels = true,
    showElevation = false,
    highlightCell,
    offsetX = 0,
    offsetY = 0,
  } = options;

  const { isoW, isoH, pedestalH } = get25DMetrics(cellSize);

  // Center coordinate calculation
  // Total span in 2.5D:
  // X spans from -(map.height) * (isoW / 2) to +(map.width) * (isoW / 2)
  // Origin puts grid (0, 0) at originX, originY
  const originX = offsetX;
  const originY = offsetY;

  // Back-to-front rendering order:
  // Iterate diagonal sum = 0 to (width + height - 2)
  const maxDiag = map.width + map.height - 2;

  // Draw foundation shadow under whole island
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  // Outline base diamond on floor
  const topC = { x: originX, y: originY + pedestalH + 12 };
  const rightC = { x: originX + map.width * (isoW / 2), y: originY + map.width * (isoH / 2) + pedestalH + 12 };
  const bottomC = { x: originX + (map.width - map.height) * (isoW / 2), y: originY + (map.width + map.height) * (isoH / 2) + pedestalH + 12 };
  const leftC = { x: originX - map.height * (isoW / 2), y: originY + map.height * (isoH / 2) + pedestalH + 12 };
  ctx.moveTo(topC.x, topC.y);
  ctx.lineTo(rightC.x, rightC.y);
  ctx.lineTo(bottomC.x, bottomC.y);
  ctx.lineTo(leftC.x, leftC.y);
  ctx.closePath();
  ctx.filter = 'blur(8px)';
  ctx.fill();
  ctx.restore();

  for (let diag = 0; diag <= maxDiag; diag++) {
    // Collect tiles on this diagonal
    const minX = Math.max(0, diag - (map.height - 1));
    const maxX = Math.min(map.width - 1, diag);

    for (let x = minX; x <= maxX; x++) {
      const y = diag - x;
      const tile = map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' };
      const isHovered = highlightCell?.x === x && highlightCell?.y === y;

      drawTile25D(
        ctx,
        tile,
        x,
        y,
        originX,
        originY,
        cellSize,
        showGrid,
        colorOnlyMode,
        showLabels,
        showElevation,
        isHovered
      );
    }
  }
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
    showElevation = false,
    viewProjection = '2D',
    highlightCell,
    offsetX = 0,
    offsetY = 0,
  } = options;

  if (viewProjection === '2.5D') {
    renderGridMap25D(ctx, map, options);
    return;
  }

  // Standard 2D Top-Down rendering
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y * map.width + x] || { terrain: 'grass', obj: '' };
      const drawX = offsetX + x * cellSize;
      const drawY = offsetY + y * cellSize;

      drawTile(ctx, tile, drawX, drawY, cellSize, showGrid, colorOnlyMode, showLabels, showElevation);
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
  showElevation: boolean = false,
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
            drawTile(ctx, tile, drawX, drawY, cellSize, false, colorOnlyMode, showLabels, showElevation);
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
